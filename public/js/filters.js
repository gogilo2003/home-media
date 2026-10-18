// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el, escapeHtml } from './util.js';
import { catalogVideos, state, saveState } from './state.js';

/** @type {Record<string, string>} */
const LABELS = { movie: 'Movies', series: 'Series', music: 'Music', other: 'Others' };
const ORDER = ['movie', 'series', 'music', 'other'];
const chipHost = el('media-type-chips');
const genreSelect = /** @type {HTMLSelectElement} */ (el('genre-select'));
const sortSelect = /** @type {HTMLSelectElement} */ (el('sort-select'));

/** @param {() => void} onChange */
export function initFilters(onChange) {
  chipHost.addEventListener('click', (event) => {
    const target = /** @type {Element | null} */ (event.target);
    const chip = target?.closest('[data-media-type]');
    if (!chip) return;
    state.mediaType = chip.getAttribute('data-media-type') || 'All';
    state.page = 1;
    state.view = 'grid';
    syncFilters();
    saveState();
    onChange();
  });
  genreSelect.addEventListener('change', () => {
    state.genre = genreSelect.value;
    state.page = 1;
    saveState();
    onChange();
  });
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    state.page = 1;
    saveState();
    onChange();
  });
}

/** One chip per media type present in the catalog, `All` first. */
export function fillMediaTypes() {
  const present = new Set(/** @type {string[]} */ (catalogVideos().map((video) => video.mediaType ?? '')));
  const types = ORDER.filter((type) => present.has(type));
  chipHost.innerHTML = ['All', ...types]
    .map((type) => `<button type="button" data-media-type="${type}" class="chip${type === state.mediaType ? ' active' : ''}">${escapeHtml(LABELS[type] ?? type)}</button>`)
    .join('');
}

export function syncFilters() {
  chipHost.querySelectorAll('[data-media-type]').forEach((chip) => chip.classList.toggle('active', chip.getAttribute('data-media-type') === state.mediaType));
  genreSelect.value = state.genre;
  sortSelect.value = state.sort;
}

/** Distinct genres across the catalog; the control stays hidden when empty. */
export function fillGenres() {
  const genres = [...new Set(catalogVideos().flatMap((video) => video.genres ?? []))].sort((a, b) => a.localeCompare(b));
  if (genres.length === 0) {
    genreSelect.classList.add('hidden');
    return;
  }
  genreSelect.classList.remove('hidden');
  genreSelect.innerHTML = `<option value="All">All genres</option>${genres
    .map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join('')}`;
}
