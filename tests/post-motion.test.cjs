const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
const filename = path.resolve(__dirname, '../src/utils/post-motion.ts'),
  compiled = new Module(filename, module);
compiled.filename = filename;
compiled._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  filename,
);
class El extends EventTarget {
  constructor(effect) {
    super();
    this.dataset = { postMotion: effect };
    this.attrs = new Map();
    this.classes = new Set();
    this.classList = {
      add: (...a) => a.forEach((x) => this.classes.add(x)),
      remove: (...a) => a.forEach((x) => this.classes.delete(x)),
      contains: (x) => this.classes.has(x),
    };
    this.textContent = '문구';
    this.style = { setProperty() {} };
    this.children = [];
    this.rect = { left: 20, top: 600, bottom: 840, width: 320, height: 240 };
    this.scrollTop = 0;
    this.scrollHeight = 2000;
    this.clientHeight = 800;
  }
  getContext() {
    return { drawImage() {} };
  }
  querySelectorAll() {
    return this.children;
  }
  querySelector(selector) {
    return selector === 'img' ? this.image || null : null;
  }
  getAttribute(k) {
    return this.attrs.get(k) || null;
  }
  setAttribute(k, v) {
    this.attrs.set(k, v);
  }
  removeAttribute(k) {
    this.attrs.delete(k);
  }
  getBoundingClientRect() {
    return this.rect;
  }
  contains(el) {
    return this === el || this.children.includes(el);
  }
  closest(selector) {
    return selector === '[data-post-motion]' ? this : null;
  }
  appendChild(el) {
    this.children.push(el);
    el.parentElement = this;
  }
  remove() {
    this.parentElement.children = this.parentElement.children.filter((x) => x !== this);
  }
}
function setup(effects, { desktop = false } = {}) {
  const keys = [
    'window',
    'Element',
    'IntersectionObserver',
    'KeyboardEvent',
    'document',
    'setTimeout',
    'clearTimeout',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ];
  const originals = Object.fromEntries(keys.map((k) => [k, global[k]]));
  let now = 0,
    id = 0;
  const timers = new Map(),
    observers = [];
  const reduced = new EventTarget();
  reduced.matches = false;
  const windowMock = new EventTarget();
  Object.assign(windowMock, {
    innerHeight: 800,
    innerWidth: 1000,
    matchMedia: () => reduced,
    getComputedStyle: (el) => ({ overflowY: el === scroller ? 'scroll' : 'visible', borderRadius: '0px' }),
    IntersectionObserver: true,
  });
  const scroller = new El(),
    root = new El();
  root.children = effects.map((effect) => new El(effect));
  if (desktop) root.parentElement = scroller;
  const body = new El();
  global.window = windowMock;
  global.Element = El;
  global.KeyboardEvent = class extends Event {};
  global.document = { scrollingElement: scroller, body, createElement: () => new El() };
  global.setTimeout = (cb, ms) => {
    timers.set(++id, { cb, at: now + ms });
    return id;
  };
  global.clearTimeout = (id) => timers.delete(id);
  global.requestAnimationFrame = (cb) => global.setTimeout(cb, 0);
  global.cancelAnimationFrame = global.clearTimeout;
  global.IntersectionObserver = class {
    constructor(cb, options = {}) {
      this.cb = cb;
      this.options = options;
      observers.push(this);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  for (const el of root.children)
    if (el.dataset.postMotion === 'photo-fly') {
      el.image = new El();
      Object.assign(el.image, { complete: true, naturalWidth: 640, currentSrc: '/test.webp', alt: '사진' });
    }
  const dispose = compiled.exports.installPostMotion(root);
  const tick = (ms) => {
    const until = now + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].cb();
    }
    now = until;
  };
  const entry = (index, visible = true) => ({
    target: root.children[index],
    isIntersecting: visible,
    boundingClientRect: root.children[index].rect,
  });
  const end = (el) => {
    const event = new Event('animationend');
    Object.defineProperty(event, 'target', { value: el });
    root.dispatchEvent(event);
  };
  const click = (el) => {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: el });
    root.dispatchEvent(event);
  };
  return {
    root,
    body,
    observers,
    reduced,
    scroller,
    tick,
    entry,
    end,
    click,
    scroll: () => {
      (root.parentElement ? scroller : windowMock).dispatchEvent(new Event('scroll'));
      tick(0);
    },
    changeMode(desktopNow) {
      root.parentElement = desktopNow ? scroller : null;
      windowMock.dispatchEvent(new Event('resize'));
    },
    cleanup() {
      dispose();
      assert.equal(body.children.length, 0);
      assert.equal(timers.size, 0);
      Object.assign(global, originals);
    },
  };
}
test('55% default effects wait for predecessors, run one at a time, and click replays', () => {
  const f = setup(['wiggle', 'underline']);
  try {
    assert.equal(f.observers[0].options.rootMargin, '0px 0px -360px 0px');
    assert.equal(f.observers[1].options.rootMargin, '0px 0px -680px 0px');
    f.observers[0].cb([f.entry(1)]);
    assert.ok(!f.root.children[1].classes.has('motion-running'));
    f.observers[0].cb([f.entry(0)]);
    assert.ok(f.root.children[0].classes.has('motion-running'));
    f.end(f.root.children[0]);
    assert.ok(f.root.children[1].classes.has('motion-running'));
    f.end(f.root.children[1]);
    f.click(f.root.children[0]);
    assert.ok(f.root.children[0].classes.has('motion-running'));
    f.end(f.root.children[0]);
  } finally {
    f.cleanup();
  }
});
test('fly starts immediately at 15%, preserves slot, and clicking the wall restores the original photo', () => {
  const f = setup(['photo-fly']);
  try {
    const photo = f.root.children[0],
      height = photo.rect.height;
    f.observers[1].cb([f.entry(0)]);
    assert.equal(f.body.children.length, 1);
    assert.ok(photo.classes.has('motion-gone'));
    assert.equal(photo.rect.height, height);
    f.end(photo);
    assert.equal(f.body.children.length, 0);
    assert.ok(photo.classes.has('motion-gone'));
    f.click(photo);
    assert.ok(!photo.classes.has('motion-gone'));
  } finally {
    f.cleanup();
  }
});
for (const desktop of [false, true])
  test(`bottom flush drains remaining effects in order (${
    desktop ? 'internal desktop scroll' : 'mobile page scroll'
  })`, () => {
    const f = setup(['wiggle', 'photo-fly', 'underline'], { desktop });
    try {
      f.scroller.scrollTop = 1200;
      f.scroll();
      assert.ok(f.root.children[0].classes.has('motion-running'));
      f.end(f.root.children[0]);
      assert.ok(f.root.children[1].classes.has('motion-running'));
      assert.ok(!f.root.children[2].classes.has('motion-running'));
      f.end(f.root.children[1]);
      assert.ok(f.root.children[2].classes.has('motion-running'));
      f.end(f.root.children[2]);
    } finally {
      f.cleanup();
    }
  });
test('fly also waits for the previous effect; reduced motion restores photos and cancels all work', () => {
  const f = setup(['wiggle', 'photo-fly']);
  try {
    f.observers[0].cb([f.entry(0)]);
    f.observers[1].cb([f.entry(1)]);
    f.tick(500);
    assert.equal(f.body.children.length, 0);
    f.end(f.root.children[0]);
    assert.equal(f.body.children.length, 1);
    f.reduced.matches = true;
    f.reduced.dispatchEvent(new Event('change'));
    assert.equal(f.body.children.length, 0);
    assert.ok(!f.root.children[1].classes.has('motion-gone'));
  } finally {
    f.cleanup();
  }
});

test('fast scroll across the trigger zone cannot strand the later queue', () => {
  const f = setup(['wiggle', 'underline']);
  try {
    f.root.children[0].rect = { ...f.root.children[0].rect, top: -100, bottom: -60 };
    f.root.children[1].rect = { ...f.root.children[1].rect, top: 200, bottom: 240 };
    f.scroll();
    assert.ok(f.root.children[0].classes.has('motion-done'));
    assert.ok(f.root.children[1].classes.has('motion-running'));
    f.end(f.root.children[1]);
  } finally {
    f.cleanup();
  }
});
test('switching desktop to mobile reconnects the bottom detector to document scroll', () => {
  const f = setup(['underline'], { desktop: true });
  try {
    f.changeMode(false);
    f.scroller.scrollTop = 1200;
    f.scroll();
    assert.ok(f.root.children[0].classes.has('motion-running'));
    f.end(f.root.children[0]);
  } finally {
    f.cleanup();
  }
});

test('fly scroll fallback waits for 15% instead of the default 55% line', () => {
  const f = setup(['photo-fly']);
  try {
    const photo = f.root.children[0];
    photo.rect = { ...photo.rect, top: 200, bottom: 440 };
    f.scroll();
    f.tick(500);
    assert.equal(f.body.children.length, 0);
    photo.rect = { ...photo.rect, top: 120, bottom: 360 };
    f.scroll();
    assert.equal(f.body.children.length, 1);
    f.end(photo);
  } finally { f.cleanup(); }
});
