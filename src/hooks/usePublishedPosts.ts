import { useCallback, useEffect, useMemo, useState } from 'react';
import PostClass from '../models/post';

type PublishedSummary = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  category: string;
  publishedAt: number;
  excerpt: string;
  previewImages: string[];
};
export default function usePublishedPosts(existing: PostClass[]) {
  const [published, setPublished] = useState<PublishedSummary[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/posts', { cache: 'no-store', credentials: 'omit', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load posts');
        return response.json() as Promise<PublishedSummary[]>;
      })
      .then((posts) => {
        if (!controller.signal.aborted) {
          setPublished(posts);
          setError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [retry]);
  const posts = useMemo(() => {
    const dynamic = published.map(
      (post) =>
        new PostClass({
          id: `writer-${post.id}`,
          excerpt: post.excerpt,
          html: '',
          fields: { slug: post.slug },
          frontmatter: {
            title: post.title,
            author: 'KyungWan',
            emoji: post.emoji,
            categories: post.category ? [post.category] : [],
            date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
              .format(new Date(post.publishedAt))
              .replace(/-/g, '.'),
          },
          previewImages: post.previewImages.map((src) => ({ childImageSharp: { resize: { src } } })),
        }),
    );
    const timestamps = new Map(published.map((post) => [`writer-${post.id}`, post.publishedAt]));
    return [...dynamic, ...existing].sort(
      (a, b) =>
        (timestamps.get(b.id) ?? Date.parse(b.date.replace(/\./g, '-'))) -
        (timestamps.get(a.id) ?? Date.parse(a.date.replace(/\./g, '-'))),
    );
  }, [published, existing]);
  return { posts, error, retry };
}
