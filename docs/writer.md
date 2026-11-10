# Writer

Open `/write/` for a block editor with headings, automatic heading navigation, images, quotes, lists, preview, and HTML export. `/` opens the block menu. Markdown-style `# `, `## `, `### `, `> `, and `- ` change a text block. Enter creates a new block; Shift+Enter inserts a line break. IME composition is preserved.

Drafts autosave to the server after 900ms. Multiple photos can be selected together. Each photo is automatically resized to at most 1280 pixels on its longer side, progressively compressed toward 320 KiB, and uploaded separately. Raw file size does not cause rejection. Browsers without WebP encoding use JPEG. Unreadable photos are skipped while other selected photos are attached. No draft content or photos are saved to localStorage or IndexedDB. The browser retains a signed login cookie only.

## Local development

`npm run dev` mounts `/api/write` on Gatsby's development server. Data is stored in `.writer-data/`, outside public output and ignored by Git. It survives code changes and server restarts. Access is limited to loopback hostnames (`localhost`, `127.0.0.1`, `::1`); additional tailnet hosts can be explicitly listed in the private `.writer-data/allowed-hosts.json` file (a JSON array of exact hostnames or IPs). Other remote hosts cannot access private writing APIs. Allowlisted hosts still require the same password login as production; there is no localhost or Tailscale authentication bypass. Local-only credentials are read from the Git-ignored `.env.development` file (server environment takes precedence). Set `WRITE_PASSWORD` and `WRITE_SESSION_SECRET` there before starting the server. Local drafts are separate from production and are not automatically uploaded.

## Netlify production setup

The modern function at `netlify/functions/writer.mjs` uses the site-wide Netlify Blobs store `writer-content`, with strong reads and conditional writes to reject stale edits. This store persists across deploys. It is not a deploy-scoped store.

Set these environment variables in Netlify, scoped to Functions:

- `WRITE_PASSWORD`: a unique, strong writer password, at least 8 characters.
- `WRITE_SESSION_SECRET`: a separate random secret, at least 32 characters.

Deploy once after configuring the variables. Until both are set, the production API stays closed and `/write/` displays setup guidance. Sessions expire after eight hours. All private draft and image reads require login. Public readers can access only published snapshots and the images referenced by those snapshots. Writes require a same-origin request. Draft actions use JSON; photo uploads send image/webp or image/jpeg bytes. Legacy JSON photo uploads remain accepted during upgrades.

Do not put secrets in Git or expose them in `GATSBY_` variables. Preview deploys should use a different Blobs store if a private production-data boundary is required; site-wide stores otherwise share data across deploy contexts.

Saving, publishing, updating, and unpublishing do not invoke Git commits or site builds. The Publish button copies a saved draft into a separate published snapshot. Subsequent autosaves stay private until Update is pressed. Unpublish removes the snapshot from public reads while preserving the draft. Existing Markdown posts remain unchanged.

HTML export embeds the draft's images and escapes text. It is suitable as a portable copy of a draft. Published articles use `/p/<draft-id>/`. Home and Posts merge server-published articles with existing Markdown posts at runtime. Direct article URLs return complete HTML, including the title, text, photos, and heading navigation, from the public function. Runtime APIs and public pages use no-store to reflect publication changes immediately. The existing build-time RSS feed and sitemap do not currently enumerate these runtime posts.

## Publication routes

- Private: `POST /api/write/drafts/:id/publish` and `POST /api/write/drafts/:id/unpublish`.
- Public list and article data: `GET /api/posts` and `GET /api/posts/:id`.
- Public article HTML: `GET /p/:id/`.
- Public photo: `GET /api/posts/:postId/images/:imageId`, only while the published snapshot references it.

Published snapshots live under `published/` in the same site-wide Blobs store. A stale draft revision cannot be published. The first publication date is preserved during updates. Local data remains separate from Netlify production data until explicitly migrated.

## Shared article layout

Existing Markdown posts, writer preview, and runtime-published posts use the same `PostArticle`, `PostHeader`, `PostNavigator`, layout, and Markdown stylesheet. `posts:prepare` compiles this shared view for request-time server rendering and browser hydration before development, tests, and production builds. Generated files are ignored by Git. The runtime Gatsby adapter supplies only metadata and standard anchor links; it does not duplicate the article design.

## Storage version 2

- `drafts/<id>`: editable block JSON, including the saved revision.
- `images/<id>.webp` or `.jpg`: compressed binary photo; stable private/public image URLs hide the extension.
- `published/<id>-<version>.md`: immutable UTF-8 Markdown snapshots with the existing emoji, title, date, categories, featured and draft frontmatter. Heading comments retain stable navigation anchors.
- `indexes/posts`: lightweight JSON metadata and the active Markdown key for each published post. Public lists and previous/next navigation read this index, never all article bodies. Internal keys and image membership are omitted from public list responses.

A publish first saves a new Markdown snapshot, then conditionally replaces the index. The index is the public visibility boundary: failed/stale writes cannot expose a partial update. Unpublish removes the index entry and public photo access; drafts and historical Markdown versions remain private. Historical versions and unattached uploads are retained rather than automatically deleted.

An absent index automatically upgrades legacy published JSON snapshots without changing the existing draft or URL. Legacy image JSON remains readable during rollout. For local data, stop the dev server, then run `node scripts/migrate-writer.mjs .writer-data [backup-directory]`. The script makes a complete private backup before converting images, checks photo bytes, published text and unchanged draft hashes, and removes active legacy copies only after verification. Backups default to the Git-ignored `.writer-data-backups/`; restore the whole directory from a backup with the server stopped if needed. It never uploads local data to Netlify.

Production and local stores implement the same typed JSON/text/binary interface. Production uses the existing site-wide Blobs store, so subsequent code deploys do not replace saved content. One code deploy is needed to activate this implementation; writing and publishing afterward do not trigger builds. Production connection and deployment must be configured separately.

## Administrator login

Only `/write/` and its private `/api/write/*` operations require authentication. Public pages, article lists, and published images remain readable without login. Login issues an HttpOnly, SameSite=Strict signed cookie lasting eight hours (Secure on HTTPS); the password is not stored in the cookie or browser storage. Logout saves pending edits before clearing the cookie and editor state. Environment variables are server-only and must never use a `GATSBY_` prefix. The current stateless cookie is cleared on logout in that browser; rotating the session secret revokes all existing cookies.

## Photo delivery and incremental attachments

Each successful upload is inserted into the latest draft and saved before the next file is processed. A draft save failure stops the batch and keeps the unsaved photo in the editor; earlier saved photos survive reload. Decode/upload failures skip that file and continue. Navigation is held while attachments are running, and closing the tab prompts before abandoning an active batch. Concurrent saves of the same draft snapshot share one promise.

Uploaded images keep the existing compressed full-size bytes. The server validates the actual image and creates a separate 360×440 WebP preview (quality 65, no enlargement). The private `image-meta/` namespace stores dimensions, variant keys and content hashes. Legacy files receive these derivatives lazily without rewriting original photo or Markdown bytes. Publication checks use small metadata records, rather than downloading every photo again. New Markdown snapshots retain dimensions in image comments; wrappers reserve the correct aspect ratio before loading. Legacy publication indexes receive a one-time dimension backfill.

Published lists and article HTML remain `no-store`. Public full-size photos and previews use a **five-minute browser cache** (`public, max-age=300, must-revalidate`) and separate content ETags. Revalidation checks current publication membership first and can return 304 without reading the image body. Netlify CDN caching is disabled for these authenticated-by-publication image routes, so shared edge caches cannot bypass the fresh publication check. Private photo reads remain `private, no-store`. After unpublishing, new/revalidated requests are denied immediately, but photos already in a visitor's browser cache may remain usable for up to five minutes; downloaded copies cannot be revoked.

## Unified article navigation

Existing Gatsby articles and runtime Markdown articles fetch the same `/api/posts/navigation?slug=...` endpoint. It merges the build-time static manifest with the live publication index, orders by first publication date, and uses the original meaning: previous is older, next is newer. Runtime HTML includes these neighbors on the server; static HTML retains its build-time links as a fallback and refreshes live links after hydration/on focus. Writer preview does not request navigation. Runtime article links use normal anchors so Gatsby does not try to load nonexistent build-time page-data for `/p/` URLs. Unpublished articles disappear from navigation on the next refresh without a build.
