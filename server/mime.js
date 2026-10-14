export const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mov', '.m4v']);

export const VIDEO_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
};

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export function mimeFor(ext) {
  return VIDEO_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

export function isVideo(ext) {
  return VIDEO_EXTS.has(ext.toLowerCase());
}

export function staticTypeFor(ext) {
  return STATIC_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}