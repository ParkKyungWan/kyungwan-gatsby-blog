import { writerStore } from '../../server/netlify-store.mjs';
import { createWriter } from '../../server/writer.mjs';
export default async function handler(request) {
  return createWriter({ store: writerStore() })(request);
}
