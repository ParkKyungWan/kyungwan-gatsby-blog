import { writerStore } from '../../server/netlify-store.mjs';
import { createPublicPosts } from '../../server/public-posts.mjs';
export default async function handler(request) {
  return createPublicPosts({ store: writerStore() })(request);
}
