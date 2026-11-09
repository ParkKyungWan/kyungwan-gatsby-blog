export const LENS = { diameter: 184, position: 0.22, zoom: 1.28 };

export const STICKER_OVERHANG = 8;
export const STICKER_AREA_SCALE = 0.5 * (5 / 6) ** 2 * 0.85 ** 2;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Crop = Point & Size;
export type StickerSource = Size & { id: string; kind?: 'photo'; crop?: Crop; visualWeight?: number };
export type PlacedSticker = StickerSource & Point & { rotation: number; bounds: Size };
export type Board = Size & { stickers: PlacedSticker[] };

export function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Distance from the lens center to the closest point on the rotated image rectangle.
function clearsLens(sticker: PlacedSticker, viewport: Size): boolean {
  const dx = viewport.width * LENS.position - sticker.x;
  const dy = viewport.height / 2 - sticker.y;
  const cos = Math.cos(sticker.rotation);
  const sin = Math.sin(sticker.rotation);
  return (
    Math.hypot(
      Math.max(0, Math.abs(dx * cos + dy * sin) - sticker.width / 2),
      Math.max(0, Math.abs(-dx * sin + dy * cos) - sticker.height / 2),
    ) >=
    LENS.diameter * 0.4 + 2
  );
}

function gap(a: PlacedSticker, b: PlacedSticker): number {
  return Math.hypot(
    Math.max(0, Math.abs(a.x - b.x) - (a.bounds.width + b.bounds.width) / 2),
    Math.max(0, Math.abs(a.y - b.y) - (a.bounds.height + b.bounds.height) / 2),
  );
}

function overlap(a: PlacedSticker, b: PlacedSticker): number {
  const x = Math.max(0, (a.bounds.width + b.bounds.width) / 2 + 6 - Math.abs(a.x - b.x));
  const y = Math.max(0, (a.bounds.height + b.bounds.height) / 2 + 6 - Math.abs(a.y - b.y));
  return (x * y) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

function compositionScore(stickers: PlacedSticker[], viewport: Size, fullWidth = false): number {
  if (!stickers.length) return 0;
  let totalWeight = 0,
    centerX = 0,
    centerY = 0,
    edgePenalty = 0;
  const nearest = stickers.map((sticker, i) => {
    const weight = sticker.width * sticker.height * (sticker.visualWeight ?? 1);
    totalWeight += weight;
    centerX += sticker.x * weight;
    centerY += sticker.y * weight;
    const edge = Math.min(
      sticker.x - sticker.bounds.width / 2,
      viewport.width - sticker.x - sticker.bounds.width / 2,
      sticker.y - sticker.bounds.height / 2,
      viewport.height - sticker.y - sticker.bounds.height / 2,
    );
    edgePenalty += Math.max(0, 16 - edge) / 24;
    return stickers.length === 1
      ? 0
      : Math.min(...stickers.filter((_, j) => i !== j).map((other) => gap(sticker, other)));
  });
  const balance = Math.hypot(
    (centerX / totalWeight - (fullWidth ? viewport.width / 2 : viewport.width * 0.7)) / viewport.width,
    (centerY / totalWeight - viewport.height / 2) / viewport.height,
  );
  const xs = stickers.map((s) => s.x);
  const ys = stickers.map((s) => s.y);
  const spreadX = (Math.max(...xs) - Math.min(...xs)) / viewport.width;
  const spreadY = (Math.max(...ys) - Math.min(...ys)) / viewport.height;
  const crowding = stickers.reduce(
    (sum, sticker, i) => sum + stickers.slice(i + 1).reduce((pairs, other) => pairs + overlap(sticker, other), 0),
    0,
  );
  const isolation = nearest.reduce((sum, distance) => sum + Math.max(0, distance - 85) / 100, 0);
  const columns = Math.min(5, stickers.length);
  const coverage = fullWidth
    ? new Set(stickers.map((sticker) => Math.min(columns - 1, Math.floor((sticker.x / viewport.width) * columns))))
        .size / columns
    : 0;
  // Prefer breadth and asymmetric balance without rewarding maximum distance to every neighbor.
  return (
    2 * coverage +
    4 * Math.min(spreadX, 0.78) +
    Math.min(spreadY, 0.55) -
    3 * balance -
    0.35 * edgePenalty -
    0.4 * isolation -
    20 * crowding
  );
}

export function createBoard(
  sources: StickerSource[],
  viewport: Size,
  random = Math.random,
  mobile = false,
  compact = mobile,
): Board {
  const fullWidth = sources.length > 0 && sources.every((source) => source.kind === 'photo');
  const shuffled = [...sources];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Resolve sizes and angles once, so resizing with the same seed preserves each sticker's character.
  const templates = shuffled.map((source) => {
    const sizeVariation = random();
    const longest = (106 + sizeVariation * 24) * Math.sqrt(STICKER_AREA_SCALE) * (mobile ? 1.18 : compact ? 1.4 : 1.15);
    const scale =
      source.kind === 'photo'
        ? (130 - 13) / (source.crop?.height ?? source.height)
        : (longest / Math.max(source.width, source.height)) *
          (source.id === 'wine' ? 1.3225 : source.id === 'shoe' ? 1.035 : source.id === 'drip' ? 0.9 : 1);
    const width = (source.crop?.width ?? source.width) * scale + (source.kind === 'photo' ? 8 : 0);
    const height = (source.crop?.height ?? source.height) * scale + (source.kind === 'photo' ? 13 : 0);
    const rotation = (random() + random() - 1) * (source.kind === 'photo' ? Math.PI / 60 : Math.PI / 10);
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    return {
      ...source,
      width,
      height,
      rotation,
      bounds: { width: cos * width + sin * height, height: sin * width + cos * height },
    };
  });
  if (compact) {
    const laneStart = mobile ? 0 : viewport.width * LENS.position + LENS.diameter / 2 + 12;
    const laneWidth =
      (mobile ? viewport.width : Math.min(420, viewport.width - laneStart - 8)) / Math.max(1, templates.length);
    return {
      ...viewport,
      stickers: templates.map((template, index) => {
        const scale = Math.min(1.04, (laneWidth - 6) / template.bounds.width);
        const bounds = { width: template.bounds.width * scale, height: template.bounds.height * scale };
        const insetY = bounds.height / 2 + 10;
        return {
          ...template,
          width: template.width * scale,
          height: template.height * scale,
          bounds,
          x: laneStart + laneWidth * (index + 0.5) + (random() - 0.5) * 6,
          y: Math.max(
            insetY,
            Math.min(viewport.height - insetY, viewport.height * (index % 2 ? 0.66 : 0.34) + (random() - 0.5) * 12),
          ),
        };
      }),
    };
  }
  if (fullWidth) {
    // Quiet horizontal rhythm: equal columns, a shared baseline, and restrained spacing variation.
    const laneWidth = viewport.width / templates.length;
    return {
      ...viewport,
      stickers: templates.map((template, index) => {
        const inset = template.bounds.width / 2 + 12;
        const x = laneWidth * (index + 0.5) + (random() - 0.5) * Math.min(16, laneWidth * 0.1);
        return {
          ...template,
          x: Math.max(inset, Math.min(viewport.width - inset, x)),
          y: viewport.height / 2 + (random() - 0.5) * 6,
        };
      }),
    };
  }
  const layouts: { stickers: PlacedSticker[]; score: number }[] = [];
  for (let layout = 0; layout < 50; layout++) {
    const stickers: PlacedSticker[] = [];
    for (const template of templates) {
      // Photo collections use the whole notebook; the lens floats over the photos.
      const left = fullWidth
        ? template.bounds.width / 2 - STICKER_OVERHANG
        : Math.max(viewport.width * 0.45, viewport.width * LENS.position + LENS.diameter / 2 - 8) +
          template.bounds.width / 2;
      const top = template.bounds.height / 2 - STICKER_OVERHANG;
      const spanX = Math.max(0, viewport.width * 0.95 - template.bounds.width / 2 + STICKER_OVERHANG - left);
      const spanY = Math.max(0, viewport.height - top * 2);
      let position: PlacedSticker | undefined;
      let fallback: PlacedSticker | undefined;
      let leastOverlap = Infinity;
      // Bounded rejection sampling. A small grid fallback also handles pathological random sources.
      for (let attempt = 0; attempt < 160; attempt++) {
        const x = attempt < 80 ? random() : ((attempt - 80) % 10) / 9;
        const y = attempt < 80 ? random() : Math.floor((attempt - 80) / 10) / 7;
        const next = { ...template, x: left + x * spanX, y: top + y * spanY };
        if (!fullWidth && !clearsLens(next, viewport)) continue;
        const crowding = stickers.reduce((sum, other) => sum + overlap(next, other), 0);
        if (crowding < leastOverlap) {
          fallback = next;
          leastOverlap = crowding;
        }
        if (stickers.every((other) => gap(next, other) >= 6)) {
          position = next;
          break;
        }
      }
      // At narrow widths, prefer slight crowding to dropping an asset; lens exclusion is never relaxed.
      if (position ?? fallback) stickers.push((position ?? fallback)!);
    }
    layouts.push({ stickers, score: compositionScore(stickers, viewport, fullWidth) });
  }
  // Completeness and geometric exclusions take precedence over every aesthetic preference.
  layouts.sort((a, b) => b.stickers.length - a.stickers.length || b.score - a.score);
  const complete = layouts.filter((layout) => layout.stickers.length === layouts[0].stickers.length);
  const spaced = complete.filter((layout) =>
    layout.stickers.every((sticker, index) =>
      layout.stickers.slice(index + 1).every((other) => gap(sticker, other) >= 6),
    ),
  );
  const candidates = spaced.length ? spaced : complete;
  const choice = candidates[Math.floor(random() * Math.min(5, candidates.length))];
  return { ...viewport, stickers: choice.stickers };
}
