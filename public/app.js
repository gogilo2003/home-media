const grid = document.getElementById('video-grid');
const empty = document.getElementById('empty');
const listView = document.getElementById('list-view');
const playerView = document.getElementById('player-view');
const player = document.getElementById('player');
const title = document.getElementById('player-title');

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatSize(bytes) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

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

function renderCards(videos) {
  grid.innerHTML = videos.map((v) => `
    <button data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name)}"
      class="text-left p-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition">
      <div class="font-medium truncate">${escapeHtml(v.name)}</div>
      <div class="text-xs text-slate-500 mt-1">${formatSize(v.size)}</div>
    </button>
  `).join('');
  grid.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => play(btn.dataset.id, btn.dataset.name));
  });
}

async function loadVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();

  if (!videos.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  renderCards(videos);
}

document.getElementById('back-btn').addEventListener('click', back);
loadVideos().catch((err) => console.error(err));