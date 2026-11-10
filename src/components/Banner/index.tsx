import { useTheme } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';

import { Board, createBoard, LENS, seededRandom, PlacedSticker } from './board';
import { MOBILE_MAX_WIDTH } from '@/src/styles/const';
import { drawCoffeeBrew } from './coffee';
import { createMagnet, moveMagnet, returnMagnet, selectMagnet, stepMagnet } from './magnet';
import * as S from './styled';
import { wineFeed } from './wine-feed';
import { climbingReels } from './climbing-reels';
import stickerMetadata from './sticker-metadata.json';
import { createLensMedia } from './media';

const CANVAS_BLEED = 12;
const stickers = [
  { id: 'guinea', label: '기니피그' },
  { id: 'shoe', label: '암벽화' },
  { id: 'wine', label: '와인' },
  { id: 'drip', label: '드립커피' },
] as const;

const HomeBanner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const redrawRef = useRef<() => void>(() => {});
  const selectStickerRef = useRef<(id: string) => void>(() => {});
  const [mobileStickers, setMobileStickers] = useState<PlacedSticker[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const lens = lensRef.current;
    const lensContext = lens?.getContext('2d');
    const surface = canvas?.parentElement;
    if (!canvas || !context || !surface || !lens || !lensContext) return;
    let disposed = false;
    let frame = 0;
    let resizeFrame = 0;
    let sceneDirty = true;
    let assetsReady = false;
    let board: Board | null = null;
    let magnet = createMagnet({ x: surface.clientWidth * LENS.position, y: surface.clientHeight / 2 });
    const lensSurface = lens.parentElement;
    if (!lensSurface) return;
    const seed = Math.floor(Math.random() * 0x100000000);
    const images = new Map<string, HTMLImageElement>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);

    const media = createLensMedia({ climbingReels, winePhotos: wineFeed, onReady: () => requestDraw() });
    for (const player of Object.values(media.videos)) lensSurface.appendChild(player);
    let video = media.videos.guinea;
    let activeMovie: 'guinea' | 'climbing' | null = null;
    let movieGeneration = 0;
    let videoOpacity = 0;
    let coffeeOpacity = 0;
    let coffeeStarted = 0;
    let wineOpacity = 0;
    let wineStarted: number | null = null;
    const winePhotos = media.photos;
    let previousDrawTime = 0;
    let videoRequested = false;
    let videoFailed = false;

    const requestDraw = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    };
    const draw = (time: number) => {
      frame = 0;
      if (!board || disposed) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      const { width, height } = board;
      // Reuse the finished sticker canvas while only the lens is moving.
      if (sceneDirty) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width + CANVAS_BLEED * 2, height + CANVAS_BLEED * 2);
        board.stickers.forEach((sticker) => {
          const image = images.get(sticker.id);
          if (!image) return;
          context.save();
          context.translate(sticker.x + CANVAS_BLEED, sticker.y + CANVAS_BLEED);
          context.rotate(sticker.rotation);
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
        sceneDirty = false;
        // Start the two movies and three photos only after the sticker canvas has been drawn.
        media.warm();
      }
      const diameter = lens.clientWidth;
      const zoom = LENS.zoom;
      const moving = stepMagnet(magnet, time, board.stickers, reducedMotion);
      const { x: centerX, y: centerY } = magnet.position;
      lensSurface.style.transform = `translate(-50%, -50%) translate3d(${centerX - width * LENS.position}px, ${
        centerY - height / 2
      }px, 0)`;
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

      // The movie replaces only the lens view; the board canvas always keeps the sticker.
      const guinea = board.stickers.find((sticker) => sticker.id === 'guinea');
      const lensVisible = mobileQuery.matches
        ? surface.hasAttribute('data-mobile-selected')
        : surface.hasAttribute('data-lens-active');
      const focused = Boolean(
        lensVisible &&
          guinea &&
          magnet.locked &&
          Math.hypot(magnet.locked.x - guinea.x, magnet.locked.y - guinea.y) < 1,
      );
      const shoe = board.stickers.find((sticker) => sticker.id === 'shoe');
      const climbingFocused = Boolean(
        lensVisible && shoe && magnet.locked && Math.hypot(magnet.locked.x - shoe.x, magnet.locked.y - shoe.y) < 1,
      );
      const movieScene = climbingFocused ? 'climbing' : focused ? 'guinea' : null;
      if (movieScene && movieScene !== activeMovie) {
        video.pause();
        video = media.videos[movieScene];
        videoOpacity = 0;
        videoRequested = false;
        videoFailed = Boolean(video.error);
        activeMovie = movieScene;
        movieGeneration++;
      }
      const dripper = board.stickers.find((sticker) => sticker.id === 'drip');
      const coffeeFocused = Boolean(
        lensVisible &&
          dripper &&
          magnet.locked &&
          Math.hypot(magnet.locked.x - dripper.x, magnet.locked.y - dripper.y) < 1,
      );
      if (coffeeFocused && !coffeeStarted) coffeeStarted = time;
      const wine = board.stickers.find((sticker) => sticker.id === 'wine');
      const wineFocused = Boolean(
        lensVisible && wine && magnet.locked && Math.hypot(magnet.locked.x - wine.x, magnet.locked.y - wine.y) < 1,
      );
      lensSurface.dataset.scene = wineFocused ? 'wine' : coffeeFocused ? 'coffee' : movieScene ?? 'magnify';
      if (movieScene && !videoRequested && !videoFailed) {
        videoRequested = true;
        const generation = movieGeneration;
        video
          .play()
          .then(requestDraw)
          .catch(() => {
            if (disposed || generation !== movieGeneration || !activeMovie) return;
            videoRequested = false;
            videoFailed = true;
            requestDraw();
          });
      }
      const showVideo = Boolean(movieScene) && !videoFailed && !video.paused && video.readyState >= 2;
      const targetOpacity = showVideo ? 1 : 0;
      const delta = previousDrawTime ? Math.min(64, time - previousDrawTime) : 16;
      previousDrawTime = time;
      videoOpacity = reducedMotion
        ? targetOpacity
        : Math.max(0, Math.min(1, videoOpacity + ((showVideo ? 1 : -1) * delta) / 80));
      if (videoOpacity > 0 && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const side = Math.min(video.videoWidth, video.videoHeight);
        lensContext.save();
        lensContext.globalAlpha = videoOpacity;
        lensContext.drawImage(
          video,
          (video.videoWidth - side) / 2,
          (video.videoHeight - side) / 2,
          side,
          side,
          0,
          0,
          diameter,
          diameter,
        );
        lensContext.restore();
      }
      if (!movieScene && videoOpacity === 0 && activeMovie) {
        video.pause();
        activeMovie = null;
        movieGeneration++;
        videoRequested = false;
        videoFailed = false;
      }
      const coffeeTarget = coffeeFocused ? 1 : 0;
      coffeeOpacity = reducedMotion
        ? coffeeTarget
        : Math.max(0, Math.min(1, coffeeOpacity + ((coffeeFocused ? 1 : -1) * delta) / 240));
      if (coffeeOpacity > 0) {
        lensContext.save();
        lensContext.globalAlpha = coffeeOpacity;
        drawCoffeeBrew(lensContext, diameter, reducedMotion ? 9000 : time - coffeeStarted, dripper!, coffeeOpacity);
        lensContext.restore();
      }
      if (!coffeeFocused && coffeeOpacity === 0) coffeeStarted = 0;
      const wineTarget = wineFocused && winePhotos.length > 0 ? 1 : 0;
      wineOpacity = reducedMotion
        ? wineTarget
        : Math.max(0, Math.min(1, wineOpacity + ((wineTarget ? 1 : -1) * delta) / 240));
      if (wineOpacity > 0 && winePhotos.length > 0) {
        if (wineStarted === null) {
          wineStarted = time;
          // Shuffle on each new focus, so the feed never plays in posting order.
          for (let i = winePhotos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [winePhotos[i], winePhotos[j]] = [winePhotos[j], winePhotos[i]];
          }
        }
        const elapsed = reducedMotion ? 0 : time - wineStarted;
        const index = Math.floor(elapsed / 3000) % winePhotos.length;
        const blend = Math.max(0, Math.min(1, ((elapsed % 3000) - 2600) / 400));
        const drawPhoto = (photo: HTMLImageElement, alpha: number) => {
          const side = Math.min(photo.naturalWidth, photo.naturalHeight);
          lensContext.save();
          lensContext.globalAlpha = alpha;
          lensContext.beginPath();
          lensContext.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
          lensContext.clip();
          lensContext.drawImage(
            photo,
            (photo.naturalWidth - side) / 2,
            (photo.naturalHeight - side) / 2,
            side,
            side,
            0,
            0,
            diameter,
            diameter,
          );
          lensContext.restore();
        };
        drawPhoto(winePhotos[index], wineOpacity);
        if (blend > 0 && winePhotos.length > 1) {
          drawPhoto(winePhotos[(index + 1) % winePhotos.length], wineOpacity * blend);
        }
        // Feed-style page dots stay anchored to the inside bottom of the convex lens.
        const activeIndex = blend >= 0.5 ? (index + 1) % winePhotos.length : index;
        const spacing = diameter <= 120 ? 9 : 11;
        const radius = diameter <= 120 ? 2.4 : 2.8;
        const dotsY = diameter - (diameter <= 120 ? 13 : 17);
        lensContext.save();
        lensContext.globalAlpha = wineOpacity;
        lensContext.shadowColor = 'rgba(0, 0, 0, 0.55)';
        lensContext.shadowBlur = 3;
        lensContext.shadowOffsetY = 1;
        for (let i = 0; i < winePhotos.length; i++) {
          lensContext.beginPath();
          lensContext.arc(
            diameter / 2 + (i - (winePhotos.length - 1) / 2) * spacing,
            dotsY,
            i === activeIndex ? radius * 1.3 : radius,
            0,
            Math.PI * 2,
          );
          lensContext.fillStyle = i === activeIndex ? '#ffffff' : '#8e8e93';
          lensContext.fill();
        }
        lensContext.restore();
      }
      if (!wineFocused && wineOpacity === 0) wineStarted = null;
      if (
        moving ||
        videoOpacity !== targetOpacity ||
        (showVideo && !video.ended) ||
        coffeeOpacity !== coffeeTarget ||
        (coffeeFocused && !reducedMotion) ||
        wineOpacity !== wineTarget ||
        (wineFocused && winePhotos.length > 1 && !reducedMotion)
      )
        requestDraw();
    };
    const resize = () => {
      if (!assetsReady) return;
      const width = surface.clientWidth;
      const height = surface.clientHeight;
      if (!width || !height) return;
      const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        board?.width === width &&
        board.height === height &&
        canvas.width === Math.round((width + CANVAS_BLEED * 2) * nextRatio)
      )
        return;
      sceneDirty = true;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round((width + CANVAS_BLEED * 2) * ratio);
      canvas.height = Math.round((height + CANVAS_BLEED * 2) * ratio);
      lens.width = Math.round(lens.clientWidth * ratio);
      lens.height = Math.round(lens.clientHeight * ratio);
      magnet = createMagnet({ x: width * LENS.position, y: height / 2 });
      board = createBoard(
        stickers
          .filter((sticker) => images.has(sticker.id))
          .map((sticker) => {
            const image = images.get(sticker.id)!;
            return {
              id: sticker.id,
              width: image.naturalWidth,
              height: image.naturalHeight,
              crop: stickerMetadata[sticker.id],
              visualWeight: stickerMetadata[sticker.id].visualWeight,
            };
          }),
        { width, height },
        seededRandom(seed),
        mobileQuery.matches,
        true,
      );
      surface.removeAttribute('data-mobile-selected');
      setMobileStickers(mobileQuery.matches ? board.stickers : []);
      requestDraw();
    };
    selectStickerRef.current = (id) => {
      const sticker = board?.stickers.find((item) => item.id === id);
      if (!mobileQuery.matches || !sticker) return;
      const firstSelection = !surface.hasAttribute('data-mobile-selected');
      const entry = firstSelection ? { x: -lens.clientWidth / 2 - 12, y: board!.height / 2 } : undefined;
      selectMagnet(magnet, sticker, performance.now(), entry);
      if (entry) {
        lensSurface.style.transform = `translate(-50%, -50%) translate3d(${
          entry.x - board!.width * LENS.position
        }px, 0, 0)`;
      }
      surface.setAttribute('data-mobile-selected', 'true');
      requestDraw();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (mobileQuery.matches || event.pointerType === 'touch' || !board) return;
      if (!surface.hasAttribute('data-lens-active')) surface.setAttribute('data-lens-active', 'true');
      const rect = surface.getBoundingClientRect();
      moveMagnet(
        magnet,
        {
          x: Math.max(0, Math.min(board.width, event.clientX - rect.left - surface.clientLeft)),
          y: Math.max(0, Math.min(board.height, event.clientY - rect.top - surface.clientTop)),
        },
        performance.now(),
      );
      if (magnet.phase !== 'idle') requestDraw();
    };
    const onPointerLeave = () => {
      surface.removeAttribute('data-lens-active');
      if (mobileQuery.matches) return;
      if (!board) return;
      returnMagnet(magnet, { x: board.width * LENS.position, y: board.height / 2 }, performance.now());
      requestDraw();
    };
    const releaseLens = () => {
      if (
        !board ||
        (!surface.hasAttribute('data-lens-active') && !surface.hasAttribute('data-mobile-selected') && !magnet.locked)
      )
        return;
      surface.removeAttribute('data-lens-active');
      surface.removeAttribute('data-mobile-selected');
      returnMagnet(magnet, { x: board.width * LENS.position, y: board.height / 2 }, performance.now());
      requestDraw();
    };
    const onOutsidePointer = (event: MouseEvent | PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        releaseLens();
    };
    const onOutsideFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !surface.contains(event.target)) releaseLens();
    };
    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('click', onOutsidePointer, true);
    document.addEventListener('focusin', onOutsideFocus, true);
    window.addEventListener('blur', releaseLens);
    surface.addEventListener('pointerenter', onPointerMove);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerleave', onPointerLeave);
    surface.addEventListener('pointercancel', onPointerLeave);
    redrawRef.current = requestDraw;
    const requestResize = () => {
      if (!resizeFrame && !disposed)
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = 0;
          resize();
        });
    };
    const observer = new ResizeObserver(requestResize);
    observer.observe(surface);
    window.addEventListener('resize', requestResize);
    Promise.all(
      stickers.map(
        (sticker) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              if (!disposed) {
                images.set(sticker.id, image);
              }
              resolve();
            };
            image.onerror = () => resolve();
            image.src = `/banner/${sticker.id}.png`;
          }),
      ),
    ).then(() => {
      if (disposed) return;
      assetsReady = true;
      resize();
    });
    return () => {
      disposed = true;
      media.dispose();
      redrawRef.current = () => {};
      selectStickerRef.current = () => {};
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      surface.removeAttribute('data-lens-active');
      surface.removeEventListener('pointerenter', onPointerMove);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerleave', onPointerLeave);
      surface.removeEventListener('pointercancel', onPointerLeave);
      window.removeEventListener('resize', requestResize);
      document.removeEventListener('pointerdown', onOutsidePointer, true);
      document.removeEventListener('click', onOutsidePointer, true);
      document.removeEventListener('focusin', onOutsideFocus, true);
      window.removeEventListener('blur', releaseLens);
    };
  }, []);

  useEffect(() => redrawRef.current(), [theme]);

  return (
    <S.Wrapper aria-label='취향 스티커 모음'>
      <S.Inner>
        <S.Viewport>
          <S.Canvas ref={canvasRef} role='img' aria-label='기니피그, 암벽화, 와인, 드립커피 스티커'>
            {stickers.map((sticker) => sticker.label).join(', ')}
          </S.Canvas>
          {mobileStickers.map((sticker) => (
            <S.StickerTarget
              key={sticker.id}
              aria-label={`${stickers.find((item) => item.id === sticker.id)?.label} 확대`}
              style={{
                left: sticker.x,
                top: sticker.y,
                width: Math.max(44, sticker.bounds.width),
                height: Math.max(44, sticker.bounds.height),
              }}
              onClick={() => selectStickerRef.current(sticker.id)}
            />
          ))}
          <S.Lens aria-hidden='true'>
            <S.LensCanvas ref={lensRef} />
          </S.Lens>
        </S.Viewport>
      </S.Inner>
    </S.Wrapper>
  );
};

export default HomeBanner;
