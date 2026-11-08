import { Point } from './board';

const RESIST_MS = 110;
const PULL_MS = 180;
const SNAP_MS = 120;
const SNAP_RADIUS = 66;
const RELEASE_RADIUS = 84;

type Phase = 'idle' | 'resist' | 'pull' | 'snap' | 'home';
export type Magnet = {
  position: Point;
  origin: Point;
  target: Point;
  phase: Phase;
  started: number;
  locked: Point | null;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mix = (a: Point, b: Point, amount: number): Point => ({
  x: a.x + (b.x - a.x) * amount,
  y: a.y + (b.y - a.y) * amount,
});

export function nearestPoint<T extends Point>(points: readonly T[], target: Point): T | undefined {
  return points.reduce<T | undefined>(
    (nearest, point) => (!nearest || distance(point, target) < distance(nearest, target) ? point : nearest),
    undefined,
  );
}

export function createMagnet(home: Point): Magnet {
  return { position: { ...home }, origin: { ...home }, target: { ...home }, phase: 'idle', started: 0, locked: null };
}

export function moveMagnet(state: Magnet, target: Point, time: number): void {
  // A wider release radius prevents the lens from flickering between nearby stickers.
  if (state.locked && distance(target, state.locked) < RELEASE_RADIUS) return;
  state.locked = null;
  state.target = { ...target };
  if (state.phase === 'resist' || state.phase === 'pull') return;
  if (distance(target, state.position) < 5) return;
  state.origin = { ...state.position };
  state.started = time;
  state.phase = 'resist';
}

export function returnMagnet(state: Magnet, home: Point, time: number): void {
  state.origin = { ...state.position };
  state.target = { ...home };
  state.locked = null;
  state.started = time;
  state.phase = 'home';
}

// An explicit tap always selects its target, even within the previous sticker's release radius.
export function selectMagnet(state: Magnet, target: Point, time: number, entry?: Point): void {
  if (entry) state.position = { ...entry };
  state.locked = null;
  state.phase = 'idle';
  moveMagnet(state, target, time);
}

export function stepMagnet(state: Magnet, time: number, stickers: Point[], reducedMotion = false): boolean {
  if (state.phase === 'idle') return false;
  if (reducedMotion) {
    const nearest = state.phase === 'home' ? undefined : nearestPoint(stickers, state.target);
    state.locked = nearest && distance(nearest, state.target) <= SNAP_RADIUS ? nearest : null;
    state.position = { ...(state.locked ?? state.target) };
    state.phase = 'idle';
    return false;
  }
  const elapsed = Math.max(0, time - state.started);
  if (state.phase === 'resist') {
    // Barely yield at first; then abruptly release the magnetic tension.
    state.position = mix(state.origin, state.target, Math.min(1, elapsed / RESIST_MS) ** 2 * 0.045);
    if (elapsed < RESIST_MS) return true;
    state.origin = { ...state.position };
    state.started = time;
    state.phase = 'pull';
    return true;
  }
  const duration = state.phase === 'snap' ? SNAP_MS : PULL_MS;
  const progress = Math.min(1, elapsed / duration);
  state.position = mix(state.origin, state.target, 1 - (1 - progress) ** 4);
  if (progress < 1) return true;
  if (state.phase === 'pull') {
    const nearest = nearestPoint(stickers, state.position);
    if (nearest && distance(nearest, state.position) <= SNAP_RADIUS) {
      state.origin = { ...state.position };
      state.target = { x: nearest.x, y: nearest.y };
      state.locked = state.target;
      state.started = time;
      state.phase = 'snap';
      return true;
    }
  }
  state.phase = 'idle';
  return false;
}
