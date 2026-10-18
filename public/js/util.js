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
