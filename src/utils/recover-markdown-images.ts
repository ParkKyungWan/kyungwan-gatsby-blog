/** Recover transient responsive-image failures without adding requests on successful loads. */
export function recoverMarkdownImages(root: HTMLElement): () => void {
  const attempts = new WeakMap<HTMLImageElement, number>();
  const timers = new Map<HTMLImageElement, ReturnType<typeof setTimeout>>();
  let disposed = false;

  const recover = (image: HTMLImageElement) => {
    const fallback = image.getAttribute('src');
    const count = attempts.get(image) ?? 0;
    if (disposed || !fallback || fallback.startsWith('data:') || count >= 2 || timers.has(image)) return;
    attempts.set(image, count + 1);

    const retry = () => {
      timers.delete(image);
      if (disposed) return;
      // <picture> sources override img.src: disable them as well as img.srcset.
      image
        .closest('picture')
        ?.querySelectorAll('source')
        .forEach((source) => source.setAttribute('media', 'not all'));
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      const url = new URL(fallback, image.ownerDocument.baseURI);
      url.searchParams.set('image-retry', String(count + 1));
      image.src = url.href;
    };
    if (count === 0) retry();
    else timers.set(image, setTimeout(retry, 350));
  };
  const onError = (event: Event) => {
    const image = event.target as HTMLImageElement | null;
    if (image?.tagName === 'IMG') recover(image);
  };
  // Image errors do not bubble. Capture also catches failures from lazy-loaded images.
  root.addEventListener('error', onError, true);
  root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (image.complete && image.naturalWidth === 0) recover(image);
  });
  return () => {
    disposed = true;
    root.removeEventListener('error', onError, true);
    timers.forEach(clearTimeout);
    timers.clear();
  };
}
