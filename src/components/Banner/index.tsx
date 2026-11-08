import { useTheme } from '@emotion/react';
import React, { useEffect, useRef } from 'react';

import { Board, createBoard, Crop, LENS, seededRandom } from './board';
import * as S from './styled';

const CANVAS_BLEED = 12;
const stickers = [
  { id: 'guinea', label: '기니피그' },
  { id: 'stone', label: '클라이밍 홀드' },
  { id: 'shoe', label: '암벽화' },
  { id: 'wine', label: '와인' },
  { id: 'drip', label: '드립커피' },
];

function visibleBounds(image: HTMLImageElement): Crop | undefined {
  const buffer = document.createElement('canvas');
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  const context = buffer.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, buffer.width, buffer.height).data;
  let left = buffer.width,
    top = buffer.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < buffer.height; y++)
    for (let x = 0; x < buffer.width; x++) {
      if (pixels[(y * buffer.width + x) * 4 + 3] <= 16) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  if (right >= left) return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

const HomeBanner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const lens = lensRef.current;
    const lensContext = lens?.getContext('2d');
    const surface = canvas?.parentElement;
    if (!canvas || !context || !surface || !lens || !lensContext) return;
    let disposed = false;
    let frame = 0;
    let startTime = 0;
    let board: Board | null = null;
    const seed = Math.floor(Math.random() * 0x100000000);
    const images = new Map<string, HTMLImageElement>();
    const crops = new Map<string, Crop>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const requestDraw = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    };
    const draw = (time: number) => {
      frame = 0;
      if (!board || disposed) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, board.width + CANVAS_BLEED * 2, board.height + CANVAS_BLEED * 2);
      let animating = false;
      const { width, height } = board;
      board.stickers.forEach((sticker, index) => {
        const image = images.get(sticker.id);
        if (!image) return;
        const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, (time - startTime - index * 20) / 380));
        if (progress < 1) animating = true;
        const eased = 1 - Math.pow(1 - progress, 3);
        // A short outward release, with no bounce or continuous floating.
        const x = sticker.x + (width / 2 - sticker.x) * 0.08 * (1 - eased);
        const y = sticker.y + ((height / 2 - sticker.y) * 0.08 - 6) * (1 - eased);
        context.save();
        context.translate(x + CANVAS_BLEED, y + CANVAS_BLEED);
        context.rotate(sticker.rotation * (0.8 + eased * 0.2));
        context.scale(0.96 + eased * 0.04, 0.96 + eased * 0.04);
        context.globalAlpha = eased;
        context.shadowColor = 'rgba(0,0,0,0.1)';
        context.shadowBlur = 2;
        context.shadowOffsetY = 2;
        const crop = sticker.crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
        context.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          -sticker.width / 2,
          -sticker.height / 2,
          sticker.width,
          sticker.height,
        );
        context.restore();
      });
      const diameter = lens.clientWidth;
      const zoom = LENS.zoom;
      const centerX = width * LENS.position;
      const centerY = height / 2;
      lensContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      lensContext.clearRect(0, 0, diameter, diameter);
      lensContext.save();
      lensContext.translate(diameter / 2, diameter / 2);
      lensContext.scale(zoom, zoom);
      lensContext.translate(-centerX, -centerY);
      const radius = diameter / 2 / zoom;
      const { color } = themeRef.current;
      lensContext.fillStyle = color.white99;
      lensContext.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      lensContext.strokeStyle = color.gray20;
      lensContext.lineWidth = 1;
      lensContext.beginPath();
      for (let x = Math.floor((centerX - radius) / 20) * 20 - 1; x <= centerX + radius; x += 20) {
        lensContext.moveTo(x, centerY - radius);
        lensContext.lineTo(x, centerY + radius);
      }
      for (let y = Math.floor((centerY - radius) / 20) * 20 - 1; y <= centerY + radius; y += 20) {
        lensContext.moveTo(centerX - radius, y);
        lensContext.lineTo(centerX + radius, y);
      }
      lensContext.stroke();
      lensContext.drawImage(canvas, -CANVAS_BLEED, -CANVAS_BLEED, width + CANVAS_BLEED * 2, height + CANVAS_BLEED * 2);
      lensContext.restore();
      if (animating) requestDraw();
    };
    const resize = () => {
      const width = surface.clientWidth;
      const height = surface.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round((width + CANVAS_BLEED * 2) * ratio);
      canvas.height = Math.round((height + CANVAS_BLEED * 2) * ratio);
      lens.width = Math.round(lens.clientWidth * ratio);
      lens.height = Math.round(lens.clientHeight * ratio);
      board = createBoard(
        stickers
          .filter((sticker) => images.has(sticker.id))
          .map((sticker) => {
            const image = images.get(sticker.id)!;
            return {
              id: sticker.id,
              width: image.naturalWidth,
              height: image.naturalHeight,
              crop: crops.get(sticker.id),
            };
          }),
        { width, height },
        seededRandom(seed),
      );
      requestDraw();
    };
    redrawRef.current = requestDraw;
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    window.addEventListener('resize', resize);
    Promise.all(
      stickers.map(
        (sticker) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              if (!disposed) {
                images.set(sticker.id, image);
                try {
                  const crop = visibleBounds(image);
                  if (crop) crops.set(sticker.id, crop);
                } catch {
                  /* If pixel access is unavailable, retain the original image bounds. */
                }
              }
              resolve();
            };
            image.onerror = () => resolve();
            image.src = `/banner/${sticker.id}.png`;
          }),
      ),
    ).then(() => {
      if (disposed) return;
      startTime = performance.now();
      resize();
    });
    return () => {
      disposed = true;
      redrawRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => redrawRef.current(), [theme]);

  return (
    <S.Wrapper aria-label='취향 스티커 모음'>
      <S.Inner>
        <S.Viewport>
          <S.Canvas ref={canvasRef} role='img' aria-label='기니피그, 클라이밍 홀드, 암벽화, 와인, 드립커피 스티커'>
            {stickers.map((sticker) => sticker.label).join(', ')}
          </S.Canvas>
          <S.Lens aria-hidden='true'>
            <S.LensCanvas ref={lensRef} />
          </S.Lens>
        </S.Viewport>
      </S.Inner>
    </S.Wrapper>
  );
};

export default HomeBanner;
