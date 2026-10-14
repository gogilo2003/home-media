export function encodeId(relPath) {
  return Buffer.from(relPath, 'utf8').toString('base64url');
}

// base64url decoding is lenient — it silently drops invalid characters rather
// than throwing — so validate the alphabet and round-trip before trusting an id.
export function decodeId(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('malformed id');
  const rel = Buffer.from(id, 'base64url').toString('utf8');
  if (Buffer.from(rel, 'utf8').toString('base64url') !== id) throw new Error('malformed id');
  return rel;
}