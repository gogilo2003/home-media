// @ts-check
import { el } from './js/util.js';
import { state, loadCatalog, restoreState, saveState } from './js/state.js';
import { closeSeries } from './js/series.js';
import { render, setPlayHandler, syncTabs } from './js/browse.js';

const listView = el('list-view');
const playerView = el('player-view');
const player = /** @type {HTMLVideoElement} */ (el('player'));
const playerTitle = el('player-title');
const search = /** @type {HTMLInputElement} */ (el('search-input'));
const loading = el('loading');
const errorBox = el('error');
const tabs = Array.from(document.querySelectorAll('.category-tab'));

/** @param {string} id @param {string} name */
function play(id, name) {
  player.src = `/video/${id}`;
  playerTitle.textContent = name;
  listView.classList.add('hidden');
  playerView.classList.remove('hidden');
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
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    closeSeries();
    state.category = tab.getAttribute('data-category') || 'All';
    state.page = 1;
    syncTabs(state.category);
    saveState();
    render();
  }));
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
  syncTabs(state.category);
  wireControls();
  try {
    await loadCatalog();
    render();
  } catch (err) {
    console.error(err);
    errorBox.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

boot();
