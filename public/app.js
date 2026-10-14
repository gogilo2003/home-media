// @ts-check
/** @typedef {import('../types.ts').Video} Video */

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
function el(id) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return /** @type {T} */ (found);
}

const grid = el('video-grid');
const empty = el('empty');
const listView = el('list-view');
const playerView = el('player-view');
const player = /** @type {HTMLVideoElement} */ (el('player'));
const title = el('player-title');
const searchInput = /** @type {HTMLInputElement} */ (el('search-input'));
const categoryTabs = Array.from(document.querySelectorAll('.category-tab'));

/** @type {Video[]} */
let allVideos = [];

/** @type {{category: string, query: string}} */
let state = { category: 'All', query: '' };

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** @param {number} bytes */
function formatSize(bytes) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit] ?? 'B'}`;
}

/** @type {Record<string, string>} */
const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** @param {unknown} s */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** @param {string} id @param {string} name */
function play(id, name) {
  player.src = `/video/${id}`;
  title.textContent = name;
  listView.classList.add('hidden');
  playerView.classList.remove('hidden');
  player.play().catch(() => {});
}

function back() {
  player.pause();
  player.removeAttribute('src');
  player.load();
  playerView.classList.add('hidden');
  listView.classList.remove('hidden');
}

/** @param {Video[]} videos */
function renderCards(videos) {
  if (videos.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = videos
    .map((v) => {
      const cat = v.category || 'Other';
      return `
    <button data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name)}"
      class="group text-left rounded-xl bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/70 hover:border-slate-600 transition shadow-[0_30px_60px_-40px_rgba(15,23,42,0.9)] overflow-hidden">
      <div class="aspect-video w-full relative bg-gradient-to-br from-slate-700/60 to-slate-900/60">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
        <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-900/80 border border-slate-700/80 text-slate-200 capitalize">${escapeHtml(cat.toLowerCase())}</span>
        </div>
      </div>
      <div class="p-3">
        <div class="font-medium truncate text-slate-100 group-hover:text-white transition">${escapeHtml(v.name)}</div>
        <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span>${formatSize(v.size)}</span>
        </div>
      </div>
    </button>
  `;
    })
    .join('');
  grid.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => play(btn.dataset.id ?? '', btn.dataset.name ?? ''));
  });
}

function filterVideos() {
  const query = state.query.trim().toLowerCase();
  let result = allVideos;
  if (state.category !== 'All') {
    result = result.filter((v) => (v.category || 'Other') === state.category);
  }
  if (query.length > 0) {
    result = result.filter((v) => v.name.toLowerCase().includes(query));
  }
  renderCards(result);
}

async function loadVideos() {
  const res = await fetch('/api/videos');
  const data = /** @type {any} */ (await res.json());
  allVideos = Array.isArray(data) ? data : (data.videos || []);
  filterVideos();
}

el('back-btn').addEventListener('click', back);

categoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    categoryTabs.forEach((t) => {
      t.classList.remove('active', 'bg-gradient-to-br', 'from-indigo-500', 'to-indigo-600', 'text-white', 'shadow-[0_8px_30px_-12px_rgba(99,102,241,1)]');
      t.classList.add('bg-slate-800/60', 'border', 'border-slate-700', 'text-slate-300', 'hover:bg-slate-800/80');
    });
    tab.classList.remove('bg-slate-800/60', 'border', 'border-slate-700', 'text-slate-300', 'hover:bg-slate-800/80');
    tab.classList.add('active', 'bg-gradient-to-br', 'from-indigo-500', 'to-indigo-600', 'text-white', 'shadow-[0_8px_30px_-12px_rgba(99,102,241,1)]');
    state.category = tab.getAttribute("data-category") || 'All';
    filterVideos();
  });
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  filterVideos();
});

if (window.matchMedia('(min-width: 768px)').matches) {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

loadVideos().catch((err) => console.error(err));
