import crypto from 'node:crypto';
import { readImage, saveImage } from './content-store.mjs';
const pending = new WeakMap();
const digest = (data) => '"' + crypto.createHash('sha256').update(data).digest('hex') + '"';
async function variants(store, id, bytes, type, saveOriginal) {
  const { default: sharp } = await import('sharp');
  let metadata, thumbnail;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    if (!metadata.width || !metadata.height || !['webp', 'jpeg'].includes(metadata.format))
      throw new Error('Invalid image');
    thumbnail = await sharp(bytes)
      .resize({ width: 360, height: 440, fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 65 })
      .toBuffer();
  } catch (cause) {
    throw Object.assign(new Error('Invalid image', { cause }), { invalidImage: true });
  }
  if (saveOriginal && !(await saveImage(store, id, bytes, type))) throw new Error('Image could not be saved');
  const thumbnailKey = `images/${id}-thumb.webp`;
  await store.writeBinary(thumbnailKey, thumbnail);
  const info = {
    width: metadata.width,
    height: metadata.height,
    type,
    thumbnailKey,
    etag: digest(bytes),
    thumbnailEtag: digest(thumbnail),
  };
  await store.write(`image-meta/${id}`, info);
  return info;
}
export const prepareImage = (store, id, bytes, type) => variants(store, id, bytes, type, true);
export async function imageInfo(store, id) {
  const current = await store.read(`image-meta/${id}`);
  if (current) return current.data;
  let tasks = pending.get(store);
  if (!tasks) {
    tasks = new Map();
    pending.set(store, tasks);
  }
  if (!tasks.has(id))
    tasks.set(
      id,
      (async () => {
        const original = await readImage(store, id);
        if (!original) return null;
        try {
          return await variants(store, id, original.data, original.type, false);
        } catch (error) {
          if (error.invalidImage) return null;
          throw error;
        }
      })().finally(() => tasks.delete(id)),
    );
  return tasks.get(id);
}
export async function publicImageData(store, id, preview, info) {
  if (preview && info) {
    const value = await store.readBinary(info.thumbnailKey);
    if (value) return { data: value.data, type: 'image/webp' };
  }
  return readImage(store, id);
}

export async function imageInfos(store, ids) {
  const info = {};
  for (let start = 0; start < ids.length; start += 4) {
    await Promise.all(
      ids.slice(start, start + 4).map(async (id) => {
        info[id] = await imageInfo(store, id);
      }),
    );
  }
  return info;
}
