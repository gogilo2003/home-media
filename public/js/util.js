// @ts-check

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** @type {Record<string, string>} */
const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
export function el(id) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return /** @type {T} */ (found);
}

/** @param {unknown} s */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** @param {number} bytes */
export function formatSize(bytes) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit] ?? 'B'}`;
}

/** @param {string | undefined} source */
export function previewMarkup(source) {
  return source
    ? `<img data-preview src="${escapeHtml(source)}" alt="" class="absolute inset-0 h-full w-full object-cover">`
    : '';
}

/** @param {number} seconds */
export function runtimeOf(seconds) {
  const mins = Math.round(seconds / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

/**
 * Meta line: `year · genres · runtime` when the M0 fields exist, otherwise
 * the pre-M0 fallback `category · size`.
 * @param {import('../../types.ts').Video} video
 */
export function metaOf(video) {
  const bits = [
    video.year ? String(video.year) : '',
    (video.genres ?? []).slice(0, 2).join(', '),
    video.runtime ? runtimeOf(video.runtime) : '',
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : `${video.category || 'Other'} · ${formatSize(video.size)}`;
}

/** Resolution badge, parsed from the filename — only rendered when present. @param {string} name */
export function qualityOf(name) {
  return name.match(/\b(2160p|1080p|720p|480p|4k)\b/i)?.[1] ?? null;
}
