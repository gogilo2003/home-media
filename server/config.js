import path from 'node:path';

export const PORT = process.env.PORT || 3000;
export const VIDEO_ROOT = path.resolve(process.env.VIDEO_ROOT || './videos');
export const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

export const STATIC_ROUTES = {
  '/': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
};