// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el, escapeHtml } from './util.js';
import { catalogVideos, state, saveState } from './state.js';
import { closeSeries } from './series.js';

const chips = Array.from(document.querySelectorAll('.chip'));
const genreSelect = /** @type {HTMLSelectElement} */ (el('genre-select'));
const sortSelect = /** @type {HTMLSelectElement} */ (el('sort-select'));

/** @param {() => void} onChange */
export function initFilters(onChange) {
  chips.forEach((chip) => chip.addEventListener('click', () => {
    closeSeries();
    state.category = chip.getAttribute('data-category') || 'All';
    state.page = 1;
    state.view = 'grid';
    syncFilters();
    saveState();
    onChange();
  }));
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

export function syncFilters() {
  chips.forEach((chip) => chip.classList.toggle('active', chip.getAttribute('data-category') === state.category));
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
