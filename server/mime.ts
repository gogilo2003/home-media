export type VideoExt = '.mp4' | '.webm' | '.mkv' | '.mov' | '.m4v';

export const VIDEO_EXTS: ReadonlySet<VideoExt> = new Set<VideoExt>([
  '.mp4',
  '.webm',
  '.mkv',
  '.mov',
  '.m4v',
]);

export const VIDEO_TYPES: Readonly<Record<VideoExt, string>> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
};

const STATIC_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export function isVideo(ext: string): ext is VideoExt {
  return (VIDEO_EXTS as ReadonlySet<string>).has(ext.toLowerCase());
}

export function mimeFor(ext: VideoExt): string {
  return VIDEO_TYPES[ext];
}

export function staticTypeFor(ext: string): string {
  return STATIC_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}