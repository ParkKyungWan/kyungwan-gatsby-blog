import { failure } from './git-repository.mjs';
export async function deleteStoredDraft(store, id, revision, repository) {
  const key = `drafts/${id}`;
  const current = await store.read(key);
  if (!current?.data.deleted && (current?.data.revision || 0) !== revision)
    throw failure('다른 탭에서 변경된 초안이에요. 다시 불러온 뒤 삭제해 주세요.');
  // Git must succeed before private content is removed, so failures can be retried.
  const result = await repository.deletePublished(id);
  if (!current?.data.deleted) {
    if ((current?.data.revision || 0) !== revision)
      throw failure('다른 탭에서 변경된 초안이에요. 다시 불러온 뒤 삭제해 주세요.');
    // A small tombstone prevents a stale autosave from recreating the deleted draft.
    if (!(await store.write(key, { id, deleted: true, revision: (current?.data.revision || 0) + 1 }, current?.etag)))
      throw failure('초안이 변경됐어요. 다시 불러온 뒤 삭제해 주세요.');
  }
  const keys = await store.list(`draft-files/${id}/`);
  for (let start = 0; start < keys.length; start += 8)
    await Promise.all(keys.slice(start, start + 8).map((key) => store.delete(key)));
  await store.delete(`draft-assets/${id}`);
  return { deleted: true, ...result };
}
