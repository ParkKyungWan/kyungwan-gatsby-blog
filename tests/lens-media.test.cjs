const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function setup() {
  const videos = [],
    images = [];
  let ready = 0;
  class Video {
    constructor() {
      this.events = new Map();
      this.loads = 0;
      this.pauses = 0;
    }
    addEventListener(name, handler) {
      this.events.set(name, handler);
    }
    removeEventListener(name) {
      this.events.delete(name);
    }
    load() {
      this.loads++;
    }
    pause() {
      this.pauses++;
    }
    removeAttribute(name) {
      delete this[name];
    }
    remove() {
      this.removed = true;
    }
  }
  class Image {
    constructor() {
      images.push(this);
    }
  }
  const exports = {};
  new Function(
    'exports',
    'document',
    'Image',
    ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/components/Banner/media.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(
    exports,
    {
      createElement: () => {
        const video = new Video();
        videos.push(video);
        return video;
      },
    },
    Image,
  );
  const media = exports.createLensMedia({
    climbingReels: ['a.mp4', 'b.mp4', 'c.mp4'],
    winePhotos: ['1.webp', '2.webp', '3.webp', '4.webp'].map((src) => ({ src })),
    random: () => 0.4,
    onReady: () => ready++,
  });
  return { media, videos, images, ready: () => ready };
}

test('warmup loads exactly two movies and three distinct photos only once', () => {
  const { media, videos, images } = setup();
  assert.equal(images.length, 0);
  assert.ok(videos.every((video) => !video.src && video.loads === 0));
  media.warm();
  assert.equal(media.videos.guinea.src, '/banner/guinea-lens.mp4');
  assert.equal(media.videos.climbing.src, 'b.mp4');
  assert.ok(videos.every((video) => video.loads === 1 && video.preload === 'auto' && video.muted && video.playsInline));
  assert.equal(images.length, 3);
  assert.equal(new Set(images.map((image) => image.src)).size, 3);
  media.warm();
  assert.equal(images.length, 3);
  assert.ok(videos.every((video) => video.loads === 1));
});

test('a slow photo does not block other photos or either buffered movie', () => {
  const { media, images, videos, ready } = setup();
  media.warm();
  images[1].onload();
  assert.deepEqual(media.photos, [images[1]]);
  assert.equal(ready(), 1);
  videos[0].events.get('loadeddata')();
  assert.equal(ready(), 2);
  images[2].onload();
  assert.deepEqual(media.photos, [images[1], images[2]]);
});

test('leaving the page releases both players and ignores late photo callbacks', () => {
  const { media, videos, images, ready } = setup();
  media.warm();
  const latePhoto = images[0].onload;
  const lateVideo = videos[0].events.get('loadeddata');
  media.dispose();
  latePhoto();
  lateVideo();
  assert.equal(ready(), 0);
  assert.equal(media.photos.length, 0);
  assert.ok(images.every((image) => image.onload === null));
  assert.ok(videos.every((video) => !video.src && video.pauses === 1 && video.removed && video.events.size === 0));
  media.warm();
  media.dispose();
  assert.ok(videos.every((video) => video.loads === 2));
  assert.equal(images.length, 3);
});
