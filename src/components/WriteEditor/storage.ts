import { Draft, Publication } from './model';
export type DraftSummary = Pick<Draft, 'id' | 'title' | 'category' | 'updatedAt'>;
export class WriterError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const result = await fetch(`/api/write/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await result.json();
  if (!result.ok) throw new WriterError(data.error || '저장 서버에 연결하지 못했어요.', result.status);
  return data;
}
export const session = () =>
  api<{ signedIn: boolean; configured: boolean; storage: string; gitConfigured: boolean }>('session');
export const login = (password: string) => api('session', 'POST', { password });
export const listDrafts = () => api<DraftSummary[]>('drafts');
export type GitPost = { slug: string; title: string; category: string; date: string; draft: boolean };
export const listGitPosts = () => api<GitPost[]>('posts');
export async function importGitPost(slug: string, replace = false) {
  const draft = await api<Draft>(`posts/${slug}/import`, 'POST', { replace });
  revisions.set(draft.id, draft.revision ?? 0);
  return draft;
}
export const getPublication = (id: string) => api<Publication | null>(`drafts/${id}/publication`);
const revisions = new Map<string, number>();
export async function getDraft(id: string) {
  const draft = await api<Draft>(`drafts/${id}`);
  revisions.set(id, draft.revision ?? 0);
  return draft;
}
let queue: Promise<unknown> = Promise.resolve();
export function saveDraft(draft: Draft): Promise<Draft> {
  const task = queue.then(async () => {
    const saved = await api<Draft>(`drafts/${draft.id}`, 'PUT', {
      ...draft,
      revision: revisions.get(draft.id) ?? draft.revision ?? 0,
    });
    revisions.set(draft.id, saved.revision ?? 0);
    return saved;
  });
  queue = task.catch(() => {});
  return task;
}
export function publishDraft(draft: Draft): Promise<Publication> {
  return api<Publication>(`drafts/${draft.id}/publish`, 'POST', {
    revision: revisions.get(draft.id) ?? draft.revision ?? 0,
  });
}
export const unpublishDraft = (id: string, revision: number) =>
  api<Publication>(`drafts/${id}/unpublish`, 'POST', { revision: revisions.get(id) ?? revision });
export async function uploadImage(id: string, data: string): Promise<{ src: string; width: number; height: number }> {
  const [header, encoded] = data.split(',');
  const type = header.match(/^data:(image\/(?:webp|jpeg));base64$/)?.[1];
  if (!type || !encoded) throw new Error('사진을 변환하지 못했어요.');
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const result = await fetch(`/api/write/drafts/${id}/images`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': type },
    body: bytes,
    cache: 'no-store',
  });
  const value = await result.json();
  if (!result.ok) throw new WriterError(value.error || '사진을 저장하지 못했어요.', result.status);
  return value;
}

// Keep every upload small regardless of the original photo's file size.
export const PHOTO_TARGET_BYTES = 320 * 1024;
export async function imageBlockSource(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name))
    throw new Error('사진 파일을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error('이 사진을 읽을 수 없어요. JPG나 PNG로 다시 첨부해 주세요.');
    }
    let edge = Math.min(1280, Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 처리할 수 없어요. 다시 시도해 주세요.');
    let compressed: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = edge / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.4, 0.72 - attempt * 0.06);
      compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (compressed && compressed.type !== 'image/webp') {
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';
        compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      }
      if (compressed && compressed.size <= PHOTO_TARGET_BYTES) break;
      edge = Math.max(160, Math.round(edge * 0.75));
    }
    if (!compressed) throw new Error('사진을 변환하지 못했어요. 다시 시도해 주세요.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
      reader.readAsDataURL(compressed!);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
