import { useEffect, useState } from 'react';
import PostClass from '../models/post';
import type { MarkdownRemark } from '../type';

type Navigation = { prev?: MarkdownRemark; next?: MarkdownRemark };
export default function usePostNavigation(
  slug: string,
  enabled: boolean,
  initialPrev?: PostClass,
  initialNext?: PostClass,
) {
  const [remote, setRemote] = useState<{ slug: string; data: Navigation } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let active: AbortController | null = null;
    const refresh = () => {
      if (disposed || document.visibilityState === 'hidden' || active) return;
      const controller = new AbortController();
      active = controller;
      fetch(`/api/posts/navigation?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Navigation unavailable');
          return response.json() as Promise<Navigation>;
        })
        .then((data) => {
          if (!disposed) setRemote({ slug, data });
        })
        .catch(() => {})
        .finally(() => {
          if (active === controller) active = null;
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      active?.abort();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [slug, enabled]);
  const data = enabled && remote?.slug === slug ? remote.data : null;
  return data
    ? {
        prevPost: data.prev ? new PostClass(data.prev) : undefined,
        nextPost: data.next ? new PostClass(data.next) : undefined,
      }
    : { prevPost: initialPrev, nextPost: initialNext };
}
