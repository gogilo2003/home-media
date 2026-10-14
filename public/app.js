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
/** @type {{show: string, videos: Video[]} | null} */
let selectedSeries = null;
/** @type {string | null} */
let selectedEpisode = null;

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

/** @param {string | undefined} source */
function previewMarkup(source) {
  return source ? `<img data-preview src="${escapeHtml(source)}" alt="" class="absolute inset-0 h-full w-full object-cover">` : '';
}

/** @param {string} id @param {string} name */
function play(id, name) {
  player.src = `/video/${id}`;
  title.textContent = name;
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

/** @param {Video} video */
function seriesInfo(video) {
  const parts = video.path.replaceAll('\\', '/').split('/');
  const rootIndex = parts.findIndex((part) => ['series', 'tv', 'shows', 'tv shows'].includes(part.toLowerCase()));
  const showFolder = parts[rootIndex + 1];
  if (rootIndex < 0 || !showFolder) return null;
  const show = showFolder.replace(/[._]+/g, ' ').trim();
  const folderSeason = parts[rootIndex + 2] || '';
  const fileSeason = video.name.match(/\bS(\d{1,2})\b/i)?.[1];
  const season = /^s\d+$/i.test(folderSeason) ? `Season ${Number(folderSeason.slice(1))}`
    : /^season\s*\d+$/i.test(folderSeason) ? folderSeason.replace(/season\s*/i, 'Season ')
      : fileSeason ? `Season ${Number(fileSeason)}` : (folderSeason || 'Season 1');
  return { show, season };
}

/** @param {string} show @param {Video[]} videos */
function openSeries(show, videos) {
  selectedSeries = { show, videos };
  selectedEpisode = null;
  renderSeriesDetail();
}

function renderSeriesDetail() {
  if (!selectedSeries) return;
  const seasons = [...new Set(selectedSeries.videos.map((video) => seriesInfo(video)?.season).filter(Boolean))]
    .sort((a, b) => (a ?? '').localeCompare(b ?? '', undefined, { numeric: true }));
  const season = /** @type {HTMLSelectElement | null} */ (grid.querySelector('#season-select'))?.value || seasons[0] || '';
  const episodes = selectedSeries.videos.filter((video) => seriesInfo(video)?.season === season)
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  if (!episodes.some((episode) => episode.id === selectedEpisode)) selectedEpisode = episodes[0]?.id ?? null;
  const current = selectedSeries.videos.find((episode) => episode.id === selectedEpisode);
  grid.innerHTML = `<div class="col-span-full space-y-5">
    <div class="flex items-center gap-4"><button id="series-back" class="text-sm text-indigo-300 hover:text-white">← All titles</button><div><h2 class="text-2xl font-semibold">${escapeHtml(selectedSeries.show)}</h2><p class="text-sm text-slate-400">${episodes.length} episodes in ${escapeHtml(season)}</p></div></div>
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0"><video id="series-player" controls ${current ? `src="/video/${escapeHtml(current.id)}"` : ''} class="aspect-video w-full rounded-2xl bg-black shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)]"></video><h3 class="mt-3 font-medium">${escapeHtml(current?.name.replace(/\\.[^.]+$/, '') || 'Select an episode')}</h3></div>
      <aside class="overflow-hidden rounded-xl border border-[#222A3A] bg-gradient-to-b from-[#1C2331] to-[#151A24]"><div class="flex items-center justify-between gap-3 border-b border-[#222A3A] p-4"><h3 class="font-semibold">Episodes</h3><select id="season-select" aria-label="Select season" class="max-w-36 rounded-lg border border-[#262F40] bg-[#161B26] px-3 py-2 text-sm">${seasons.map((s) => `<option${s === season ? ' selected' : ''}>${escapeHtml(s ?? '')}</option>`).join('')}</select></div><div class="max-h-[28rem] divide-y divide-[#222A3A] overflow-y-auto">${episodes.map((v, i) => `<button data-episode="${escapeHtml(v.id)}" class="flex w-full items-start gap-3 p-3 text-left transition hover:bg-slate-800/70 ${v.id === selectedEpisode ? 'bg-indigo-500/10' : ''}"><span class="pt-0.5 text-xs text-slate-500">${String(i + 1).padStart(2, '0')}</span><span class="min-w-0 flex-1"><span class="block truncate text-sm">${escapeHtml(v.name.replace(/\\.[^.]+$/, ''))}</span><span class="mt-1 block text-xs text-slate-500">${formatSize(v.size)}</span></span><span class="text-indigo-300">${v.id === selectedEpisode ? '▶' : ''}</span></button>`).join('')}</div></aside>
    </div>
  </div>`;
  grid.querySelector('#series-back')?.addEventListener('click', () => { selectedSeries = null; filterVideos(); });
  grid.querySelector('#season-select')?.addEventListener('change', renderSeriesDetail);
  grid.querySelectorAll('button[data-episode]').forEach((btn) => {
    const button = /** @type {HTMLButtonElement} */ (btn);
    button.addEventListener('click', () => { selectedEpisode = button.dataset.episode ?? null; renderSeriesDetail(); });
  });
}

/** @param {Video[]} videos */
function renderCards(videos) {
  if (selectedSeries) { renderSeriesDetail(); return; }
  if (videos.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const shows = new Map();
  for (const video of videos) {
    if ((video.category || 'Other') !== 'Series') continue;
    const info = seriesInfo(video);
    if (info) shows.set(info.show, [...(shows.get(info.show) || []), video]);
  }
  const movies = videos.filter((video) => (video.category || 'Other') !== 'Series');
  grid.innerHTML = [...movies.map((v) => ({ video: v })), ...[...shows].map(([show, episodes]) => ({ show, episodes }))]
    .map((item) => {
      if ('show' in item) {
        const first = [...item.episodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))[0];
        return `<button data-show="${escapeHtml(item.show)}" class="group min-w-0 overflow-hidden rounded-xl border border-[#222A3A] bg-gradient-to-b from-[#1C2331] to-[#151A24] text-left shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] transition hover:border-slate-600"><div class="relative aspect-[3/4] bg-gradient-to-br from-indigo-950 via-slate-800 to-slate-950">${previewMarkup(first?.preview)}<div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div><span class="absolute bottom-3 left-3 rounded-md border border-slate-600/70 bg-slate-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">Series</span></div><div class="p-3 sm:p-4"><div class="truncate font-semibold text-slate-100 group-hover:text-white">${escapeHtml(item.show)}</div><div class="mt-1 text-xs text-slate-400">${item.episodes.length} episodes</div></div></button>`;
      }
      const v = item.video;
      const cat = v.category || 'Other';
      return `
    <button data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name)}"
      class="group overflow-hidden rounded-xl border border-[#222A3A] bg-gradient-to-b from-[#1C2331] to-[#151A24] text-left shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] transition hover:border-slate-600">
      <div class="relative aspect-[3/4] w-full bg-gradient-to-br from-indigo-950 via-slate-800 to-slate-950">
        ${previewMarkup(v.preview)}
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent${v.preview}"></div>
        <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-900/80 border border-slate-700/80 text-slate-200 capitalize">${escapeHtml(cat.toLowerCase())}</span>
        </div>
      </div>
      <div class="min-w-0 p-3 sm:p-4">
        <div class="truncate font-semibold text-slate-100 transition group-hover:text-white">${escapeHtml(v.name)}</div>
        <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span>${formatSize(v.size)}</span>
        </div>
      </div>
    </button>
  `;
    })
    .join('');
  grid.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.show) openSeries(btn.dataset.show, shows.get(btn.dataset.show) || []);
      else if (btn.dataset.id) play(btn.dataset.id, btn.dataset.name ?? '');
    });
  });
  grid.querySelectorAll('img[data-preview]').forEach((img) => img.addEventListener('error', () => img.remove(), { once: true }));
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
      t.classList.add('border', 'border-[#262F40]', 'bg-[#161B26]', 'text-slate-300', 'hover:bg-slate-800/80');
    });
    tab.classList.remove('bg-slate-800/60', 'border', 'border-slate-700', 'border-[#262F40]', 'bg-[#161B26]', 'text-slate-300', 'hover:bg-slate-800/80');
    tab.classList.add('active', 'bg-gradient-to-br', 'from-indigo-500', 'to-indigo-600', 'text-white', 'shadow-[0_8px_30px_-12px_rgba(99,102,241,1)]');
    state.category = tab.getAttribute("data-category") || 'All';
    selectedSeries = null;
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
