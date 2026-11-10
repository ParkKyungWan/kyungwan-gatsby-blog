# Writing and publishing

The public blog has one source of truth: Markdown and attachments in this repository's `content/<slug>/` directories. Gatsby's existing filesystem source, Remark plugins, GraphQL queries, image processing and post template build every public article. Blobs is private draft storage only. There is no public Blobs article API, runtime article renderer or runtime merge of post lists/navigation.

## Workflow

1. Open `/write/` and sign in. New posts use the existing block editor. Autosave writes a private draft, Gatsby-compatible Markdown and image references to Blobs; it never writes Git.
2. Under **내 글 → 기존 글 불러오기**, load articles from the current GitHub `main` branch. Existing files open as Markdown source so tables, code, inline HTML, Frontmatter and attachments are preserved rather than converted to a smaller block format. Existing unsent work is resumed unless **Git 원문 다시 불러오기** is explicitly chosen.
3. Uploads are validated, reduced to at most 1280px and 320KiB WebP, and stored under that draft. Markdown uses relative paths such as `./photo.webp`; authenticated API URLs are only for editor display. Imported attachments retain their original bytes.
4. **발행** pins the saved draft revision and validates its Frontmatter and referenced files. New posts receive the next unused numeric directory (`content/3/index.md`, for example). Updates retain the existing slug and first publication date.
5. The server creates Git blobs for the Markdown and attachments, creates one tree and commit, and updates **only `main`** without force. Unrelated concurrent commits are preserved. A changed version of the same article produces a conflict instead of an overwrite.
6. The normal Git-connected Gatsby deployment runs. The editor distinguishes `main` committed, deployment pending, deployment failed, and deployment succeeded. Only a successful Netlify commit status marks deployment complete; a successful GitHub build alone is insufficient. Unknown status remains pending and can be refreshed.
7. **공개 해제** changes `draft: true` in the last Git publication and triggers the same build/deploy flow. It does not publish unfinished edits from Blobs or delete the source files.

Repeated publication requests for the same revision and files reuse the recorded result instead of creating another post or commit. `.writer/publications.json` records numeric allocation, draft revision, bundle hash and Git subtree SHA. It is private operational metadata in the repository, not a second public content store. This manifest is updated in the same commit as the article.

## Server configuration

Keep these values in server environment variables, never in `GATSBY_` variables or committed files:

- `WRITE_PASSWORD`: at least 8 characters.
- `WRITE_SESSION_SECRET`: at least 32 characters.
- `WRITE_GITHUB_TOKEN`: a fine-grained GitHub token limited to the blog repository, with **Contents: Read and write**, **Commit statuses: Read-only**, and default Metadata read permission.
- `WRITE_GITHUB_REPOSITORY`: optional; defaults to `ParkKyungWan/kyungwan-gatsby-blog`.

On Netlify, include the **Functions** scope and **Production** deploy context. Environment variable changes require a new deploy. The token is used only on the server. Protected `main` branches must permit the configured publisher identity; the implementation never bypasses branch rules or force-pushes. GitHub Actions triggered by these commits may require additional account authorization depending on repository policy.

Without a Git token, authenticated draft saving continues to work and publication reports a configuration error. Public repositories can be read without a token subject to GitHub's unauthenticated rate limits.

## Private draft layout

The site-wide Netlify store is `writer-drafts`, independent of deploys:

- `drafts/<draft-id>`: editor state, revision, original Git subtree, attachment manifest, pointer to immutable Markdown and last acknowledged publication.
- `draft-files/<draft-id>/assets/...`: immutable, draft-scoped attachment bytes. The attachment manifest maps the eventual relative filename to the stored key.
- `draft-files/<draft-id>/revisions/<version>/index.md`: the Markdown snapshot for a saved revision, with the same Frontmatter and relative file references used in Git.
- `draft-assets/<draft-id>`: uploads received for the draft, including ones not yet saved into its body.

The manifest makes the draft a logical `index.md + attachments` bundle without copying every photo on each autosave. Publication assembles exactly that bundle under `content/<number>/`. No image URL from `/api/write` is written into published Markdown. Bundles are limited to 25MiB and imports to 150 entries. New block posts include only attached images used in their body; imported Markdown retains the original folder's attachments.

## Local development

`npm run dev` installs only `/api/write/*` on the Gatsby development server. Local files live in Git-ignored `.writer-data/`. Server-only values may be set in Git-ignored `.env.development`. Local drafts and production drafts are separate. Publishing from local development still targets the configured GitHub repository's `main`; it is never silently converted to a local-only publication.

Loopback and explicitly allowlisted hosts in `.writer-data/allowed-hosts.json` require the same login. Reads and writes require authentication; writes also require same-origin requests. Cookies are signed, HttpOnly and SameSite=Strict (Secure over HTTPS), and expire after eight hours. Rotating the session secret revokes existing cookies.

## Reset of the retired store

The owner explicitly approved deleting all former drafts, photos and published snapshots. On the first authenticated request after this change, the Netlify adapter empties the retired `writer-content` store and records completion in `writer-drafts/maintenance/legacy-reset`. Subsequent requests leave the new store intact. The local adapter similarly clears the retired local data directories once, retaining allowed-host configuration. Anonymous requests cannot trigger the reset.

The old `/api/posts`, `/p/<id>/`, runtime renderer bundles and migration scripts are removed. No migration or redirects for the discarded publications are provided. Existing Gatsby Markdown articles and their addresses remain intact.
