// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { escapeHtml, metaOf, previewMarkup, qualityOf } from './util.js';
import { isQueued, toggleQueued } from './queue.js';

/** @typedef {{video: Video} | {show: string, episodes: Video[]}} Item */

/** @param {Item} item */
export function cardMarkup(item) {
  return 'show' in item ? seriesCard(item.show, item.episodes) : videoCard(item.video);
}

/** @param {Item} item */
export function rowMarkup(item) {
  if ('show' in item) {
    const first = episodeSort(item.episodes)[0];
    return `<button type="button" data-show="${escapeHtml(item.show)}" class="row"><span class="min-w-0 flex-1 text-left"><span class="block truncate text-sm font-medium">${escapeHtml(item.show)}</span>${first ? `<span class="mt-0.5 block truncate text-xs text-[#6E7376]">${escapeHtml(metaOf(first))}</span>` : ''}</span><span class="shrink-0 text-xs text-[#A2A3A3]">${item.episodes.length} episodes</span></button>`;
  }
  return `<button type="button" data-id="${escapeHtml(item.video.id)}" data-name="${escapeHtml(item.video.name)}" class="row"><span class="min-w-0 flex-1 text-left"><span class="block truncate text-sm font-medium">${escapeHtml(item.video.name)}</span><span class="mt-0.5 block truncate text-xs text-[#6E7376]">${escapeHtml(metaOf(item.video))}</span></span></button>`;
}

/** @param {string} show @param {Video[]} episodes */
function seriesCard(show, episodes) {
  const first = episodeSort(episodes)[0];
  return `<button type="button" data-show="${escapeHtml(show)}" class="card">
    <div class="relative aspect-video bg-[#08090A]">${previewMarkup(first?.preview)}
      <span class="absolute left-2 top-2 rounded-md border border-[#303234] bg-[#101112]/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E9B477]">Series</span>
    </div>
    <div class="p-3">
      <div class="truncate text-sm font-semibold text-[#F4F0E9] group-hover:text-[#E9B477]">${escapeHtml(show)}</div>
      <div class="mt-0.5 truncate text-xs text-[#A2A3A3]">${episodes.length} episodes</div>
    </div>
  </button>`;
}

/** @param {Video} video */
function videoCard(video) {
  const quality = qualityOf(video.name);
  return `<button type="button" data-id="${escapeHtml(video.id)}" data-name="${escapeHtml(video.name)}" class="card">
    <div class="relative aspect-video bg-[#08090A]">${previewMarkup(video.preview)}
      <span class="absolute left-2 top-2 rounded-md border border-[#303234] bg-[#101112]/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#A2A3A3]">${escapeHtml((video.category || 'Other').toLowerCase())}</span>
      ${quality ? `<span class="absolute right-2 top-2 rounded-md border border-[#303234] bg-[#101112]/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#A2A3A3]">${escapeHtml(quality)}</span>` : ''}
      <span role="button" tabindex="0" data-queue-add="${escapeHtml(video.id)}" aria-label="Add to queue" class="queue-add absolute bottom-2 right-2 z-20 grid h-7 w-7 place-items-center rounded-md border border-[#303234] bg-[#101112]/85 text-sm text-[#F4F0E9]${isQueued(video.id) ? ' queued' : ''}">+</span>
    </div>
    <div class="p-3">
      <div class="truncate text-sm font-semibold text-[#F4F0E9] transition group-hover:text-[#E9B477]">${escapeHtml(video.name)}</div>
      <div class="mt-0.5 truncate text-xs text-[#A2A3A3]">${escapeHtml(metaOf(video))}</div>
    </div>
  </button>`;
}

/** @param {Video[]} episodes */
function episodeSort(episodes) {
  return [...episodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

/** @param {Video[]} videos @param {Map<string, Video[]>} shows @returns {Item[]} */
export function itemsOf(videos, shows) {
  const movies = videos.filter((video) => (video.category || 'Other') !== 'Series');
  return [...movies.map((video) => ({ video })), ...[...shows].map(([show, episodes]) => ({ show, episodes }))];
}

/**
 * @param {HTMLElement} container
 * @param {Map<string, Video[]>} shows
 * @param {(id: string, name: string) => void} play
 * @param {(show: string, episodes: Video[]) => void} open
 */
export function wireCards(container, shows, play, open) {
  container.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.show) open(btn.dataset.show, shows.get(btn.dataset.show) || []);
    else if (btn.dataset.id) play(btn.dataset.id, btn.dataset.name ?? '');
  }));
  container.querySelectorAll('img[data-preview]').forEach((img) => img.addEventListener('error', () => img.remove(), { once: true }));
  container.querySelectorAll('[data-queue-add]').forEach((node) => node.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleQueued(node.getAttribute('data-queue-add') ?? '');
  }));
}
