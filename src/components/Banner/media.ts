type Options = {
  climbingReels: readonly string[];
  winePhotos: readonly { src: string }[];
  onReady: () => void;
  random?: () => number;
};

// One visit owns two buffered players and three decoded photos. Hover never changes their sources.
export function createLensMedia({ climbingReels, winePhotos, onReady, random = Math.random }: Options) {
  const videos = {
    guinea: document.createElement('video'),
    climbing: document.createElement('video'),
  };
  const photos: HTMLImageElement[] = [];
  const pendingPhotos: HTMLImageElement[] = [];
  let started = false;
  let disposed = false;
  const notify = () => {
    if (!disposed) onReady();
  };
  for (const video of Object.values(videos)) {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.hidden = true;
    video.addEventListener('loadeddata', notify);
    video.addEventListener('playing', notify);
    video.addEventListener('error', notify);
  }
  return {
    videos,
    photos,
    warm() {
      if (started || disposed) return;
      started = true;
      videos.guinea.src = '/banner/guinea-lens.mp4';
      videos.guinea.load();
      const reel = climbingReels[Math.floor(random() * climbingReels.length)];
      if (reel) {
        videos.climbing.src = reel;
        videos.climbing.load();
      }
      const selection = [...winePhotos];
      for (let i = selection.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [selection[i], selection[j]] = [selection[j], selection[i]];
      }
      for (const { src } of selection.slice(0, 3)) {
        const photo = new Image();
        pendingPhotos.push(photo);
        photo.onload = () => {
          if (disposed) return;
          // Each photo becomes available independently; one slow file cannot block the others.
          photos.push(photo);
          notify();
        };
        photo.src = src;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const photo of pendingPhotos) photo.onload = null;
      photos.length = 0;
      for (const video of Object.values(videos)) {
        video.removeEventListener('loadeddata', notify);
        video.removeEventListener('playing', notify);
        video.removeEventListener('error', notify);
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      }
    },
  };
}
