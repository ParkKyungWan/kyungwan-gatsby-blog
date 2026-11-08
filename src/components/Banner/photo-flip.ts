const FLIP_DURATION = 360;

export type PhotoFlip = { value: number; target: boolean; lastTime: number };

export function createPhotoFlip(front: boolean, time: number): PhotoFlip {
  return { value: front ? 1 : 0, target: front, lastTime: time };
}

/** Keep the current angle when a pointer changes direction halfway through a flip. */
export function stepPhotoFlip(flip: PhotoFlip, front: boolean, time: number, reducedMotion = false): boolean {
  if (front !== flip.target) {
    flip.target = front;
    flip.lastTime = time;
  }
  const elapsed = Math.max(0, time - flip.lastTime);
  flip.lastTime = time;
  const target = front ? 1 : 0;
  flip.value = reducedMotion
    ? target
    : Math.max(0, Math.min(1, flip.value + ((front ? 1 : -1) * elapsed) / FLIP_DURATION));
  return flip.value !== target;
}

export function photoFlipPose(value: number): { front: boolean; scaleX: number; skew: number } {
  const eased = value * value * (3 - 2 * value);
  const angle = Math.PI * eased;
  return { front: value >= 0.5, scaleX: Math.max(0.012, Math.abs(Math.cos(angle))), skew: Math.sin(angle) * 0.1 };
}
