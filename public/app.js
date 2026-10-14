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
  grid.innerHTML = videos.map((v) => `
    <button data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name)}"
      class="text-left p-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition">
      <div class="font-medium truncate">${escapeHtml(v.name)}</div>
      <div class="text-xs text-slate-500 mt-1">${formatSize(v.size)}</div>
    </button>
  `).join('');
  grid.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => play(btn.dataset.id ?? '', btn.dataset.name ?? ''));
  });
}

async function loadVideos() {
  const res = await fetch('/api/videos');
  const videos = /** @type {Video[]} */ (await res.json());

  if (!videos.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  renderCards(videos);
}

el('back-btn').addEventListener('click', back);
loadVideos().catch((err) => console.error(err));