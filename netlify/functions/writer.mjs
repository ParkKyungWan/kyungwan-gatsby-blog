import { writerStore, resetLegacyStore } from '../../server/netlify-store.mjs';
import { createWriter } from '../../server/writer.mjs';
export default async function handler(request) {
  const store = writerStore();
  return createWriter({ store, resetLegacy: () => resetLegacyStore(store) })(request);
}
