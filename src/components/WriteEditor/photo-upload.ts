import { Block, Draft, makeBlock } from './model';

export function insertUploadedPhoto(draft: Draft, photo: Block, afterId: string | null): Draft {
  const blocks = [...draft.blocks];
  const found = blocks.findIndex((block) => block.id === afterId);
  const index = found < 0 ? blocks.length : found;
  const replace = blocks[index]?.type === 'paragraph' && !blocks[index].text;
  blocks.splice(index + (found >= 0 && !replace ? 1 : 0), replace ? 1 : 0, photo);
  if (blocks[blocks.length - 1].type === 'image') blocks.push(makeBlock());
  return { ...draft, blocks, updatedAt: Date.now() };
}
// Commit each image before processing the next; a failed save stops the batch.
export async function attachPhotosSequentially<T>(
  files: T[],
  actions: {
    prepare: (file: T) => Promise<string>;
    upload: (data: string) => Promise<{ src: string; width: number; height: number }>;
    commit: (file: T, photo: { src: string; width: number; height: number }) => Promise<void>;
    progress: (index: number, total: number) => void;
    failure: (file: T, error: unknown) => void;
  },
) {
  let saved = 0;
  for (const [index, file] of files.entries()) {
    actions.progress(index + 1, files.length);
    let photo;
    try {
      photo = await actions.upload(await actions.prepare(file));
    } catch (error) {
      actions.failure(file, error);
      continue;
    }
    try {
      await actions.commit(file, photo);
      saved++;
    } catch (error) {
      actions.failure(file, error);
      return { saved, stopped: true };
    }
  }
  return { saved, stopped: false };
}
