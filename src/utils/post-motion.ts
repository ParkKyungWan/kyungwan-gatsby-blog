const isFly = (element: HTMLElement) => element.dataset.postMotion === 'photo-fly';
export function installPostMotion(root: HTMLElement) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-post-motion]')).filter(
    (element) => !element.closest('.table-of-contents'),
  );
  if (!elements.length) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ready = new Set<HTMLElement>(),
    played = new Set<HTMLElement>();
  const original = new Map<HTMLElement, { role: string | null; tab: string | null; label: string | null }>();
  let active: HTMLElement | null = null,
    timeout: ReturnType<typeof setTimeout> | undefined;
  let flight: HTMLElement | null = null,
    disposed = false,
    forceRemaining = false,
    scrollFrame = 0;
  let observers: IntersectionObserver[] = [];
  let scroller: HTMLElement | null = root.parentElement;
  while (scroller && !/(auto|scroll)/.test(window.getComputedStyle(scroller).overflowY))
    scroller = scroller.parentElement;
  let scrollTarget: HTMLElement | Window = scroller || window;
  const removeFlight = () => {
    flight?.remove();
    flight = null;
  };
  const restore = (element: HTMLElement) => {
    element.classList.remove('motion-gone');
    const label = original.get(element)?.label;
    if (element.getAttribute('role') === 'button')
      element.setAttribute('aria-label', label || `${element.querySelector('img')?.alt || '사진'} · 효과 다시 재생`);
  };
  const finish = () => {
    if (!active) return;
    active.classList.remove('motion-running');
    active.classList.add('motion-done');
    active = null;
    clearTimeout(timeout);
    removeFlight();
    pump();
  };
  const fitRecess = (element: HTMLElement) => {
    const image = element.querySelector('img');
    if (!image) return;
    const rect = image.getBoundingClientRect(),
      slot = element.getBoundingClientRect();
    element.style.setProperty('--photo-left', `${rect.left - slot.left}px`);
    element.style.setProperty('--photo-top', `${rect.top - slot.top}px`);
    element.style.setProperty('--photo-width', `${rect.width}px`);
    element.style.setProperty('--photo-height', `${rect.height}px`);
  };
  const launchPhoto = (element: HTMLElement) => {
    const image = element.querySelector('img');
    if (!image || !image.complete || !image.naturalWidth) return false;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const layer = document.createElement('div');
    layer.className = 'post-photo-flight';
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    layer.style.setProperty('--flight-x', `${-Math.max(rect.left + rect.width + 40, window.innerWidth * 0.6)}px`);
    layer.style.setProperty('--flight-y', `${window.innerHeight - rect.top + rect.height + 60}px`);
    // Snapshot the already decoded image once; private preview files need no second request.
    const copy = document.createElement('canvas');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    copy.width = Math.max(1, Math.round(rect.width * ratio));
    copy.height = Math.max(1, Math.round(rect.height * ratio));
    const context = copy.getContext('2d');
    if (!context) return false;
    try {
      context.drawImage(image, 0, 0, copy.width, copy.height);
    } catch {
      return false;
    }
    copy.style.borderRadius = window.getComputedStyle(image).borderRadius;
    layer.appendChild(copy);
    const viewport = document.createElement('div');
    viewport.className = 'post-photo-flight-viewport';
    viewport.setAttribute('aria-hidden', 'true');
    viewport.appendChild(layer);
    document.body.appendChild(viewport);
    flight = viewport;
    fitRecess(element);
    element.classList.add('motion-gone');
    if (element.getAttribute('role') === 'button')
      element.setAttribute('aria-label', `${image.alt || '사진'} · 사진 복원`);
    return true;
  };
  const play = (element: HTMLElement) => {
    active = element;
    played.add(element);
    ready.delete(element);
    observers.forEach((observer) => observer.unobserve(element));
    if (isFly(element) && !launchPhoto(element)) {
      element.classList.add('motion-done');
      active = null;
      pump();
      return;
    }
    element.classList.remove('motion-done');
    element.classList.add('motion-running');
    timeout = setTimeout(
      finish,
      isFly(element) ? 900 : Math.max(1000, Number(element.getAttribute('data-motion-ms')) + 150 || 1000),
    );
  };
  const pump = () => {
    if (disposed || active) return;
    let next = elements.find((element) => !played.has(element));
    while (next && ready.has(next)) {
      if (reduced.matches || (!forceRemaining && next.getBoundingClientRect().bottom < 0)) {
        played.add(next);
        next.classList.add('motion-done');
        observers.forEach((observer) => observer.unobserve(next!));
        next = elements.find((element) => !played.has(element));
      } else {
        play(next);
        return;
      }
    }
  };
  const eligible = (element: HTMLElement) => {
    if (disposed || played.has(element) || ready.has(element)) return;
    ready.add(element);
    pump();
  };

  const checkBottom = () => {
    scrollFrame = 0;
    if (disposed || forceRemaining || reduced.matches) return;
    const container = scroller || document.scrollingElement;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight <= 3) {
      forceRemaining = true;
      elements.filter((element) => !played.has(element)).forEach(eligible);
      pump();
    }
  };
  // IntersectionObserver can miss an element that jumps across the whole trigger zone
  // between frames. Check pending markers once per scroll frame as a fallback.
  const refreshPassed = () => {
    if (disposed || reduced.matches) return;
    for (const element of elements) {
      if (played.has(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.top > window.innerHeight * (isFly(element) ? 0.15 : 0.55)) continue;
      if (isFly(element) && rect.bottom <= 0 && !forceRemaining) {
        ready.delete(element);
        played.add(element);
        element.classList.add('motion-done');
        observers.forEach((observer) => observer.unobserve(element));
      } else eligible(element);
    }
    pump();
  };
  const onScroll = () => {
    if (!scrollFrame)
      scrollFrame = requestAnimationFrame(() => {
        checkBottom();
        refreshPassed();
      });
  };
  const onEnd = (event: AnimationEvent) => {
    if (event.target === active) finish();
  };
  const replay = (event: MouseEvent | KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('a,button,input,textarea,select')) return;
    const element = target.closest<HTMLElement>('[data-post-motion]');
    if (!element || !root.contains(element) || active || reduced.matches) return;
    if (event instanceof KeyboardEvent) {
      if (event.target !== element || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
    }
    if (isFly(element) && element.classList.contains('motion-gone')) {
      restore(element);
      return;
    }
    play(element);
  };
  const observe = () => {
    let nextScroller: HTMLElement | null = root.parentElement;
    while (nextScroller && !/(auto|scroll)/.test(window.getComputedStyle(nextScroller).overflowY))
      nextScroller = nextScroller.parentElement;
    const nextTarget: HTMLElement | Window = nextScroller || window;
    if (nextTarget !== scrollTarget) {
      scrollTarget.removeEventListener('scroll', onScroll);
      scrollTarget = nextTarget;
      scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    }
    scroller = nextScroller;
    elements.filter((element) => isFly(element) && element.classList.contains('motion-gone')).forEach(fitRecess);
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    for (const [fly, line] of [
      [false, 0.55],
      [true, 0.15],
    ] as const) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting || (!fly && entry.boundingClientRect.top < 0)) eligible(element);
          }
          pump();
        },
        { rootMargin: `0px 0px -${Math.round(window.innerHeight * (1 - line))}px 0px`, threshold: 0 },
      );
      elements
        .filter((element) => !played.has(element) && isFly(element) === fly)
        .forEach((element) => observer.observe(element));
      observers.push(observer);
    }
    checkBottom();
    refreshPassed();
  };
  const replayAll = () => {
    clearTimeout(timeout);
    active = null;
    forceRemaining = false;
    removeFlight();
    played.clear();
    ready.clear();
    elements.forEach((element) => {
      restore(element);
      element.classList.remove('motion-running', 'motion-done');
    });
    void root.offsetWidth;
    observe();
  };
  const onReduced = () => {
    if (!reduced.matches) return;
    clearTimeout(timeout);
    active = null;
    removeFlight();
    elements.forEach((element) => {
      restore(element);
      played.add(element);
      element.classList.remove('motion-running');
      element.classList.add('motion-done');
    });
    observers.forEach((observer) => observer.disconnect());
  };
  for (const element of elements) {
    original.set(element, {
      role: element.getAttribute('role'),
      tab: element.getAttribute('tabindex'),
      label: element.getAttribute('aria-label'),
    });
    if (!element.closest('a') && !element.querySelector('a,button')) {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute(
        'aria-label',
        `${element.textContent?.trim() || element.querySelector('img')?.alt || '사진'} · 효과 다시 재생`,
      );
    }
  }
  root.addEventListener('animationend', onEnd);
  root.addEventListener('click', replay);
  root.addEventListener('keydown', replay);
  root.addEventListener('post-motion-replay', replayAll);
  reduced.addEventListener('change', onReduced);
  window.addEventListener('resize', observe);
  scrollTarget.addEventListener('scroll', onScroll, { passive: true });
  if ('IntersectionObserver' in window && !reduced.matches) observe();
  else
    elements.forEach((element) => {
      played.add(element);
      element.classList.add('motion-done');
    });
  return () => {
    disposed = true;
    clearTimeout(timeout);
    cancelAnimationFrame(scrollFrame);
    removeFlight();
    observers.forEach((observer) => observer.disconnect());
    root.removeEventListener('animationend', onEnd);
    root.removeEventListener('click', replay);
    root.removeEventListener('keydown', replay);
    root.removeEventListener('post-motion-replay', replayAll);
    reduced.removeEventListener('change', onReduced);
    window.removeEventListener('resize', observe);
    scrollTarget.removeEventListener('scroll', onScroll);
    for (const [element, attrs] of original) {
      element.classList.remove('motion-running', 'motion-done', 'motion-gone');
      for (const [name, value] of [
        ['role', attrs.role],
        ['tabindex', attrs.tab],
        ['aria-label', attrs.label],
      ]) {
        if (value === null) element.removeAttribute(name!);
        else element.setAttribute(name!, value!);
      }
    }
  };
}
