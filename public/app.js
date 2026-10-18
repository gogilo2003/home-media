// @ts-check
import { el } from './js/util.js';
import { state, loadCatalog, restoreState, videoById } from './js/state.js';
import { closeSeries } from './js/series.js';
import { initBrowse, render, setPlayHandler } from './js/browse.js';
import { fillGenres, syncFilters } from './js/filters.js';
import { initPlayer, loadCaptions } from './js/controls.js';

const listView = el('list-view');
const playerView = el('player-view');
const player = /** @type {HTMLVideoElement} */ (el('player'));
const playerTitle = el('player-title');
const search = /** @type {HTMLInputElement} */ (el('search-input'));
const loading = el('loading');
const errorBox = el('error');

/** @param {string} id @param {string} name */
function play(id, name) {
  player.src = `/video/${id}`;
  playerTitle.textContent = name;
  listView.classList.add('hidden');
  playerView.classList.remove('hidden');
  loadCaptions(videoById(id)?.captions ?? []);
  player.play().catch(() => { });
}

function back() {
  player.pause();
  player.removeAttribute('src');
  player.load();
  playerView.classList.add('hidden');
  listView.classList.remove('hidden');
}

function wireControls() {
  setPlayHandler(play);
  el('back-btn').addEventListener('click', back);
  search.addEventListener('input', () => {
    state.query = search.value;
    state.page = 1;
    closeSeries();
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
