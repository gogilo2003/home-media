// Heuristic media typing and title cleaning for the build pipeline.
import type { MediaType } from '../types.ts';

const SERIES_WORDS = new Set(['series', 'tv', 'shows', 'show', 'tvshows']);
const GROUP_WORDS = new Set([...SERIES_WORDS, 'movie', 'movies', 'film', 'films', 'new']);
const MUSIC_WORDS = new Set(['music']);
const MOVIE_WORDS = new Set(['movie', 'movies', 'film', 'films']);
const OTHER_WORDS = ['screencast', 'tip', 'download', 'camera'];

// "S01E02" / a "Season 3" or "Episode 4" folder anywhere in the path.
const EPISODE_RE = /s\d{1,2}[\s._-]*e\d{1,3}|season[\s._-]*\d+|episode[\s._-]*\d+/i;
const QUALITY_RE = /^(?:\d{3,4}p|4k|8k|uhd)$/i;
const RELEASE_TOKENS = new Set([
  'bluray', 'blu-ray', 'brrip', 'bdrip', 'webrip', 'web-dl', 'webdl', 'web',
  'hdrip', 'hdtv', 'dvdrip', 'dvd', 'remux', 'proper', 'repack', 'extended',
  'remastered', 'x264', 'x265', 'h264', 'h265', 'hevc', 'avc', '10bit', 'internal',
  'hdr', 'dv', 'atmos', 'truehd', 'dts', 'ac3', 'aac', 'multi', 'dual',
]);
const YEAR_RE = /\((?:19|20)\d{2}\)|\[(?:19|20)\d{2}\]|\.(?:19|20)\d{2}\./;

function normalize(segment: string): string {
  return segment.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/\d+$/, '');
}

/** Structural media type from the path: folder synonyms + episodic markers. */
export function classifyMedia(relPath: string, name = ''): MediaType {
  const folders = relPath.split(/[/\\]/).filter(Boolean).slice(0, -1).map(normalize);
  if (folders.some((f) => MUSIC_WORDS.has(f))) return 'music';
  if (folders.some((f) => SERIES_WORDS.has(f))) return 'series';
  if (folders.some((f) => OTHER_WORDS.some((w) => f.includes(w)))) return 'other';
  if (folders.some((f) => MOVIE_WORDS.has(f))) return 'movie';
  if (EPISODE_RE.test(`${relPath} ${name}`)) return 'series';
  return 'movie';
}

/** Display title from a filename: drop extension, release tags and quality. */
export function cleanTitle(name: string): string {
  const stem = name.replace(/\.[^.]+$/, '');
  const flat = stem.replace(YEAR_RE, ' ')
    .replace(/[._:]+/g, ' ').replace(/[[\](){}]+/g, ' ').replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  for (const token of flat.split(' ')) {
    const low = token.toLowerCase();
    if (QUALITY_RE.test(low) || RELEASE_TOKENS.has(low) || EPISODE_RE.test(token)) break;
    if (/^(?:19|20)\d{2}$/.test(low)) break;
    out.push(token);
  }
  return out.join(' ').trim();
}

/** Parse a series path into `{show, season, showPath}`, skipping grouping folders. */
export function seriesParts(relPath: string): { show: string; season?: string; showPath: string } | null {
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  const root = parts.findIndex((p) => SERIES_WORDS.has(normalize(p)));
  if (root < 0) return null;
  let i = root + 1;
  while (i < parts.length - 1 && GROUP_WORDS.has(normalize(parts[i]!))) i++;
  if (i >= parts.length - 1) return null;
  const show = parts[i]!.replace(/[._]+/g, ' ').trim();
  const season = i + 1 < parts.length - 1 ? parts[i + 1] : undefined;
  return { show, season, showPath: parts.slice(0, i + 1).join('/') };
}

/** Show name for a series path (empty when the path is not a series). */
export function showName(relPath: string): string {
  return seriesParts(relPath)?.show ?? '';
}
