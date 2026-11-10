export function attachKeyboardDock(root: HTMLElement) {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  let frame = 0;
  let disposed = false;
  const update = () => {
    frame = 0;
    if (disposed) return;
    const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
    const covered = Math.max(0, layoutHeight - viewport.height - viewport.offsetTop);
    // Browser chrome and pinch zoom are not keyboard occlusion.
    const inset = Math.abs(viewport.scale - 1) < 0.01 && covered >= 80 ? Math.round(covered) : 0;
    root.style.setProperty('--writer-keyboard-inset', `${inset}px`);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  viewport.addEventListener('resize', schedule);
  viewport.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  update();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    viewport.removeEventListener('resize', schedule);
    viewport.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('focusin', schedule);
    document.removeEventListener('focusout', schedule);
    root.style.removeProperty('--writer-keyboard-inset');
  };
}
