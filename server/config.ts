import path from 'node:path';

export const PORT = Number(process.env.PORT) || 3000;
export const VIDEO_ROOT = path.resolve(process.env.VIDEO_ROOT || './videos');
export const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
export const PREVIEW_DIR = path.resolve('catalog/previews');

export const STATIC_ROUTES: Readonly<Record<string, string>> = {
  '/': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
  '/logo.png': 'logo.png',
  '/favicon.png': 'favicon.png',
  '/js/util.js': 'js/util.js',
  '/js/state.js': 'js/state.js',
  '/js/browse.js': 'js/browse.js',
  '/js/series.js': 'js/series.js',
  '/js/paths.js': 'js/paths.js',
  '/js/cards.js': 'js/cards.js',
  '/js/hero.js': 'js/hero.js',
  '/js/filters.js': 'js/filters.js',
  '/js/pagination.js': 'js/pagination.js',
  '/js/preview.js': 'js/preview.js',
  '/js/controls.js': 'js/controls.js',
  '/js/watch.js': 'js/watch.js',
  '/js/watchinfo.js': 'js/watchinfo.js',
  '/js/queue.js': 'js/queue.js',
  '/js/queueui.js': 'js/queueui.js',
  '/js/resume.js': 'js/resume.js',
  '/js/navigation.js': 'js/navigation.js',
  '/js/player.js': 'js/player.js',
  '/js/navbuttons.js': 'js/navbuttons.js',
  '/js/playback.js': 'js/playback.js',
  '/js/shortcuts.js': 'js/shortcuts.js',
  '/vendor/plyr/plyr.js': 'vendor/plyr/plyr.js',
  '/vendor/plyr/plyr.css': 'vendor/plyr/plyr.css',
};
