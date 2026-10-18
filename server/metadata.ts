// Catalog shape. MetadataFields and parseTitleYear are used by the build.

export interface Episode { name: string; path: string; fullPath: string; size: number }
export interface Season { name: string; episodes: Episode[] }
export interface Series { title: string; showPath: string; seasons: Season[] }
export interface CatalogMeta {
  version: string;
  updated: string;
  videos: any[];
  series: Series[];
  counts: { Movies: number; Music: number; Series: number; Other: number; total: number };
}

/** Build-time fields added to catalog entries (v0.2.0 Phase M0). */
export interface MetadataFields {
  year?: number;
  genres?: string[];
  runtime?: number;
  synopsis?: string;
}

const GENERIC_FOLDERS = new Set([
  'movies', 'movie', 'film', 'series', 'tv', 'tv shows', 'shows', 'show',
  'music', 'other', 'others', 'videos', 'video', 'downloads', 'media',
]);

// Tokens that mark the end of a human-readable title in a release name.
const RELEASE_TOKENS = new Set([
  'bluray', 'blu-ray', 'brrip', 'bdrip', 'webrip', 'web-dl', 'webdl', 'web',
  'hdrip', 'hdtv', 'dvdrip', 'dvd', 'remux', 'proper', 'repack', 'extended',
  'remastered', 'x264', 'x265', 'h264', 'h265', 'hevc', 'avc', '10bit',
  'hdr', 'dv', 'atmos', 'truehd', 'dts', 'ac3', 'aac', 'multi', 'dual',
]);
const QUALITY_RE = /^(?:\d{3,4}p|4k|8k|uhd)$/i;
// Strict forms only — (YYYY), [YYYY], .YYYY. — never a guess.
const YEAR_RE = /\((?:19|20)\d{2}\)|\[(?:19|20)\d{2}\]|\.(?:19|20)\d{2}\./;

function extractYear(s: string): number | undefined {
  const m = YEAR_RE.exec(s);
  if (!m) return undefined;
  const n = Number(m[0].replace(/[^0-9]/g, ''));
  return n >= 1900 && n <= 2099 ? n : undefined;
}

function cleanTitle(s: string): string {
  const t = s.replace(YEAR_RE, ' ').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  for (const token of t.split(' ')) {
    const low = token.toLowerCase().replace(/[[\]()]/g, '');
    if (QUALITY_RE.test(low) || RELEASE_TOKENS.has(low)) break;
    if (/^(?:19|20)\d{2}$/.test(low)) break;
    out.push(token);
  }
  return out.join(' ').trim();
}

/**
 * Best-effort `{title, year}` from a path inside VIDEO_ROOT. The parent folder
 * wins over the filename when both carry a year; a year is only ever returned
 * from one of the strict `YEAR_RE` forms.
 */
export function parseTitleYear(relPath: string): { title?: string; year?: number } {
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  const file = parts[parts.length - 1] ?? '';
  const parent = parts[parts.length - 2] ?? '';
  const stem = file.replace(/\.[^.]+$/, '');
  const candidates = parent && !GENERIC_FOLDERS.has(parent.toLowerCase())
    ? [parent, stem]
    : [stem];
  let year = extractYear(relPath);
  for (const candidate of candidates) {
    const found = extractYear(candidate);
    if (found !== undefined) { year = found; break; }
  }
  for (const candidate of candidates) {
    const title = cleanTitle(candidate);
    if (title) return {title, year};
  }
  return {year};
}
