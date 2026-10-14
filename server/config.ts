import path from 'node:path';

export const PORT = Number(process.env.PORT) || 3000;
export const VIDEO_ROOT = path.resolve(process.env.VIDEO_ROOT || './videos');
export const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
export const PREVIEW_DIR = path.resolve('catalog/previews');
export const TRANSCODE_CACHE_ENABLED = process.env.TRANSCODE_CACHE !== '0';
export const TRANSCODE_CACHE_DIR = path.resolve(process.env.TRANSCODE_CACHE_DIR || './cache/transcoded');

export const STATIC_ROUTES: Readonly<Record<string, string>> = {
  '/': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
};
