// @ts-check
/** @typedef {import('../../types.ts').Video} Video */

const ROOTS = ['series', 'tv', 'shows', 'tv shows'];
const GROUP_DIRS = ['series', 'tv', 'shows', 'show', 'tvshows', 'movie', 'movies', 'film', 'films', 'new'];
/** @param {string} part */
const slug = (part) => part.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/\d+$/, '');

/** @param {string[]} parts @param {number} rootIndex */
function showIndex(parts, rootIndex) {
  let index = rootIndex + 1;
  while (index < parts.length - 1 && GROUP_DIRS.includes(slug(parts[index] ?? ''))) index++;
  return index;
}

/** Show name and season label parsed from a video path, or null when it is not a series. @param {Video} video */
export function seriesInfo(video) {
  const parts = video.path.replaceAll('\\', '/').split('/');
  const rootIndex = parts.findIndex((part) => ROOTS.includes(part.toLowerCase()));
  if (rootIndex < 0) return null;
  const index = showIndex(parts, rootIndex);
  if (!parts[index] || index >= parts.length - 1) return null;
  const show = parts[index].replace(/[._]+/g, ' ').trim();
  const folder = parts[index + 1] || '';
  const file = video.name.match(/\bS(\d{1,2})\b/i)?.[1];
  const season = /^s\d+$/i.test(folder) ? `Season ${Number(folder.slice(1))}`
    : /^season\s*\d+$/i.test(folder) ? folder.replace(/season\s*/i, 'Season ')
      : file ? `Season ${Number(file)}` : (folder || 'Season 1');
  return { show, season };
}
