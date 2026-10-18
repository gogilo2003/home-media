// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { escapeHtml, metaOf, previewMarkup, titleOf } from './util.js';
import { catalogVideos } from './state.js';
import { isQueued, toggleQueued } from './queue.js';

/** @param {Video} video */
function relatedCard(video) {
  return `<button type="button" data-related="${escapeHtml(video.id)}" class="card"><div class="relative aspect-video bg-[#08090A]">${previewMarkup(video.preview)}</div><div class="p-3"><div class="truncate text-sm font-semibold text-[#F4F0E9]">${escapeHtml(titleOf(video))}</div><div class="mt-0.5 truncate text-xs text-[#A2A3A3]">${escapeHtml(metaOf(video))}</div></div></button>`;
}

/**
 * Watch info block + "Stay a little longer" related row.
 * @param {HTMLElement} host
 * @param {Video} video
 * @param {(id: string) => void} onOpen
 */
export function renderInfo(host, video, onOpen) {
  const genres = video.genres ?? [];
  const related = catalogVideos()
    .filter((other) => other.id !== video.id && other.mediaType === video.mediaType)
    .slice(0, 4);
  host.innerHTML = `<div class="flex flex-wrap items-start justify-between gap-4"><div><h2 class="text-2xl font-semibold">${escapeHtml(titleOf(video))}</h2><p class="mt-2 text-sm text-[#A2A3A3]">${escapeHtml(metaOf(video))}</p>${genres.length ? `<div class="mt-3 flex flex-wrap gap-2">${genres.map((genre) => `<span class="rounded-full border border-[#303234] bg-[#191B1D] px-3 py-1 text-xs text-[#A2A3A3]">${escapeHtml(genre)}</span>`).join('')}</div>` : ''}</div><div class="flex flex-col items-start gap-3 sm:items-end"><button type="button" data-queue-add="${escapeHtml(video.id)}" aria-label="Add to queue" class="rounded-lg border border-[#303234] bg-[#191B1D] px-3 py-1.5 text-xs font-medium text-[#F4F0E9] transition hover:border-[#E9B477] hover:text-[#E9B477]${isQueued(video.id) ? ' queued' : ''}">+ Add to queue</button><p class="text-xs text-[#A2A3A3]">${(video.captions ?? []).length ? 'Captions available' : 'No captions'}</p></div></div>${video.synopsis ? `<p class="mt-4 max-w-3xl text-sm leading-6 text-[#A2A3A3]">${escapeHtml(video.synopsis)}</p>` : ''}${related.length ? `<h3 class="mt-8 text-lg font-semibold">Stay a little longer</h3><div class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">${related.map(relatedCard).join('')}</div>` : ''}`;
  host.querySelectorAll('img[data-preview]').forEach((img) => img.addEventListener('error', () => img.remove(), { once: true }));
  host.querySelectorAll('button[data-related]').forEach((btn) => btn.addEventListener('click', () => onOpen(btn.getAttribute('data-related') ?? '')));
  host.querySelectorAll('[data-queue-add]').forEach((node) => node.addEventListener('click', () => toggleQueued(node.getAttribute('data-queue-add') ?? '')));
}
