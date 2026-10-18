// @ts-check
import { el } from './js/util.js';
import { state, loadCatalog, restoreState, saveState } from './js/state.js';
import { initBrowse, render, setPlayHandler } from './js/browse.js';
import { fillGenres, syncFilters } from './js/filters.js';
import { initPlayer } from './js/controls.js';
import { initWatch, openWatch } from './js/watch.js';
import { initQueue } from './js/queueui.js';
import { initNavigation } from './js/player.js';
import { initPlayback } from './js/playback.js';
import { initShortcuts } from './js/shortcuts.js';

const search = /** @type {HTMLInputElement} */ (el('search-input'));
const loading = el('loading');
const errorBox = el('error');

function wireControls() {
  setPlayHandler(openWatch);
  initWatch(() => {
    state.page = 1;
    saveState();
    render();
  });
  initQueue(openWatch);
  search.addEventListener('input', () => {
    state.query = search.value;
    state.page = 1;
    render();
  });
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    event.preventDefault();
    search.focus();
  });
}

async function boot() {
  restoreState();
  initBrowse();
  wireControls();
  initPlayer();
  initNavigation(openWatch);
  initPlayback();
  initShortcuts();
  try {
    await loadCatalog();
    fillGenres();
    syncFilters();
    render();
  } catch (err) {
    console.error(err);
    errorBox.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

boot();
