import { getStore } from '@netlify/blobs';
export function writerStore() {
  const blobs = getStore({ name: 'writer-content', consistency: 'strong' });
  const read = (key, type) => blobs.getWithMetadata(key, { type, consistency: 'strong' });
  const write = async (key, data, etag, json = false) => {
    const options = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    if (!json && ArrayBuffer.isView(data)) data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const result = json ? await blobs.setJSON(key, data, options) : await blobs.set(key, data, options);
    return result.modified;
  };
  return {
    read: (key) => read(key, 'json'),
    readText: (key) => read(key, 'text'),
    readBinary: async (key) => {
      const value = await read(key, 'arrayBuffer');
      return value && { ...value, data: Buffer.from(value.data) };
    },
    write: (key, data, etag) => write(key, data, etag, true),
    writeText: write,
    writeBinary: write,
    async list(prefix) {
      const keys = [];
      for await (const page of blobs.list({ prefix, paginate: true })) keys.push(...page.blobs.map((blob) => blob.key));
      return keys;
    },
  };
}
