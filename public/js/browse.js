// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el, escapeHtml, formatSize, previewMarkup } from './util.js';
import { filteredVideos } from './state.js';
import { groupSeries, isSeriesOpen, openSeries, renderSeriesDetail } from './series.js';

const grid = el('video-grid');
const empty = el('empty');
const tabs = Array.from(document.querySelectorAll('.category-tab'));

/** @type {(id: string, name: string) => void} */
let playVideo = () => {};

/** @param {(id: string, name: string) => void} fn */
export function setPlayHandler(fn) {
  playVideo = fn;
}

/** @param {string} category */
export function syncTabs(category) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.getAttribute('data-category') === category));
}

export function render() {
  if (isSeriesOpen()) { renderSeriesDetail(); return; }
  const videos = filteredVideos();
  if (videos.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const shows = groupSeries(videos);
  const movies = videos.filter((video) => (video.category || 'Other') !== 'Series');
  const items = [...movies.map((video) => ({ video })), ...[...shows].map(([show, episodes]) => ({ show, episodes }))];
  grid.innerHTML = items.map((item) => ('show' in item ? seriesCard(item.show, item.episodes) : videoCard(item.video))).join('');
  grid.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.show) openSeries(btn.dataset.show, shows.get(btn.dataset.show) || [], render);
    else if (btn.dataset.id) playVideo(btn.dataset.id, btn.dataset.name ?? '');
  }));
  grid.querySelectorAll('img[data-preview]').forEach((img) => img.addEventListener('error', () => img.remove(), { once: true }));
}

/** @param {string} show @param {Video[]} episodes */
function seriesCard(show, episodes) {
  const first = [...episodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))[0];
  return `<button type="button" data-show="${escapeHtml(show)}" class="group min-w-0 overflow-hidden rounded-xl border border-[#303234] bg-[#191B1D] text-left transition hover:border-[#6E7376]">
    <div class="relative aspect-[3/4] bg-[#08090A]">${previewMarkup(first?.preview)}
      <span class="absolute bottom-3 left-3 rounded-md border border-[#303234] bg-[#101112]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#E9B477]">Series</span>
    </div>
    <div class="p-3 sm:p-4">
      <div class="truncate font-semibold text-[#F4F0E9] group-hover:text-[#E9B477]">${escapeHtml(show)}</div>
      <div class="mt-1 text-xs text-[#A2A3A3]">${episodes.length} episodes</div>
    </div>
  </button>`;
}

/** @param {Video} video */
function videoCard(video) {
  const cat = video.category || 'Other';
  return `<button type="button" data-id="${escapeHtml(video.id)}" data-name="${escapeHtml(video.name)}" class="group overflow-hidden rounded-xl border border-[#303234] bg-[#191B1D] text-left transition hover:border-[#6E7376]">
    <div class="relative aspect-[3/4] w-full bg-[#08090A]">
      ${previewMarkup(video.preview)}
      <span class="absolute bottom-2 left-2 rounded-md border border-[#303234] bg-[#101112]/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#A2A3A3]">${escapeHtml(cat.toLowerCase())}</span>
    </div>
    <div class="min-w-0 p-3 sm:p-4">
      <div class="truncate font-semibold text-[#F4F0E9] transition group-hover:text-[#E9B477]">${escapeHtml(video.name)}</div>
      <div class="mt-1 text-xs text-[#A2A3A3]">${formatSize(video.size)}</div>
    </div>
  </button>`;
}
