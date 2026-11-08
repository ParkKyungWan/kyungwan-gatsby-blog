export const LENS = { diameter: 184, position: 0.3, zoom: 1.28 };

export const STICKER_OVERHANG = 8;
export const STICKER_AREA_SCALE = 0.5 * (5 / 6) ** 2;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Crop = Point & Size;
export type StickerSource = Size & { id: string; crop?: Crop };
export type PlacedSticker = StickerSource & Point & { rotation: number; bounds: Size };
export type Board = Size & { stickers: PlacedSticker[] };

export function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createBoard(sources: StickerSource[], viewport: Size, random = Math.random): Board {
  const anchor = sources.find((source) => source.id === 'drip');
  const shuffled = sources.filter((source) => source !== anchor);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (anchor) shuffled.unshift(anchor);
  let clusterWidth = Math.min(viewport.width, Math.max(170, viewport.width * 0.34));
  let clusterLeft = viewport.width - clusterWidth;
  const stickers: PlacedSticker[] = [];
  for (const source of shuffled) {
    // Preserve aspect ratio; use the midpoint between the previous full and 2/3 side lengths.
    const longest = (106 + random() * 24) * Math.sqrt(STICKER_AREA_SCALE);
    const scale = longest / Math.max(source.width, source.height);
    const width = (source.crop?.width ?? source.width) * scale;
    const height = (source.crop?.height ?? source.height) * scale;
    // Keep the edge-tucked image flat so its visible edge actually crosses the border.
    const rotation = stickers.length ? (random() - 0.5) * 0.8 : 0;
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    const bounds = { width: cos * width + sin * height, height: sin * width + cos * height };
    const left = clusterLeft + bounds.width / 2 - STICKER_OVERHANG;
    const top = bounds.height / 2 - STICKER_OVERHANG;
    const right = viewport.width - bounds.width / 2 + STICKER_OVERHANG;
    const bottom = viewport.height - top;
    const candidate = (): Point => ({
      x: left + random() * Math.max(0, right - left),
      y: top + random() * Math.max(0, bottom - top),
    });
    let position = candidate();
    if (source === anchor) {
      // Straddle the lens rim: one part is refracted, the rest stays outside the glass.
      position = { x: viewport.width * LENS.position + LENS.diameter / 2 - width * 0.22, y: viewport.height / 2 };
    } else if (!stickers.length) {
      position.x = right;
    } else {
      const separation = (point: Point) =>
        Math.min(
          ...stickers.map((sticker) =>
            Math.hypot(
              (point.x - sticker.x) / Math.max(clusterWidth, 1),
              (point.y - sticker.y) / Math.max(viewport.height, 1),
            ),
          ),
        );
      // Spread the smaller stickers a little further apart within the right-hand cluster.
      for (let attempt = 0; attempt < 6; attempt++) {
        const next = candidate();
        if (separation(next) > separation(position)) position = next;
      }
    }
    stickers.push({ ...source, width, height, rotation, bounds, ...position });
    if (source === anchor) {
      clusterLeft = Math.max(0, Math.min(viewport.width - 120, position.x + bounds.width / 2 + 18));
      clusterWidth = viewport.width - clusterLeft;
    }
  }
  return { ...viewport, stickers };
}
