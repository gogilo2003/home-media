// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el, escapeHtml, formatSize } from './util.js';

const grid = el('video-grid');

/** @type {{show: string, videos: Video[]} | null} */
let selectedSeries = null;
/** @type {string | null} */
let selectedEpisode = null;
/** @type {() => void} */
let rerender = () => {};

export function isSeriesOpen() {
  return selectedSeries !== null;
}

export function closeSeries() {
  selectedSeries = null;
  selectedEpisode = null;
}

/** @param {Video} video */
export function seriesInfo(video) {
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

/** @param {Video[]} videos @returns {Map<string, Video[]>} */
export function groupSeries(videos) {
  const shows = new Map();
  for (const video of videos) {
    if ((video.category || 'Other') !== 'Series') continue;
    const info = seriesInfo(video);
    if (info) shows.set(info.show, [...(shows.get(info.show) || []), video]);
  }
  return shows;
}

/** @param {string} show @param {Video[]} videos @param {() => void} onBack */
export function openSeries(show, videos, onBack) {
  selectedSeries = { show, videos };
  selectedEpisode = null;
  rerender = onBack;
  renderSeriesDetail();
}

export function renderSeriesDetail() {
  if (!selectedSeries) return;
  const seasons = [...new Set(selectedSeries.videos.map((video) => seriesInfo(video)?.season).filter(Boolean))]
    .sort((a, b) => (a ?? '').localeCompare(b ?? '', undefined, { numeric: true }));
  const season = /** @type {HTMLSelectElement | null} */ (grid.querySelector('#season-select'))?.value || seasons[0] || '';
  const episodes = selectedSeries.videos.filter((video) => seriesInfo(video)?.season === season)
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  if (!episodes.some((episode) => episode.id === selectedEpisode)) selectedEpisode = episodes[0]?.id ?? null;
  const current = selectedSeries.videos.find((episode) => episode.id === selectedEpisode);
  grid.innerHTML = `<div class="col-span-full space-y-5">
    <div class="flex items-center gap-4"><button id="series-back" type="button" class="text-sm text-[#E9B477] hover:underline">← All titles</button><div><h2 class="text-2xl font-semibold">${escapeHtml(selectedSeries.show)}</h2><p class="text-sm text-[#A2A3A3]">${episodes.length} episodes in ${escapeHtml(season)}</p></div></div>
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0"><video id="series-player" controls ${current ? `src="/video/${escapeHtml(current.id)}"` : ''} class="aspect-video w-full rounded-2xl border border-[#303234] bg-black"></video><h3 class="mt-3 font-medium">${escapeHtml(current?.name.replace(/\\.[^.]+$/, '') || 'Select an episode')}</h3></div>
      <aside class="overflow-hidden rounded-xl border border-[#303234] bg-[#191B1D]"><div class="flex items-center justify-between gap-3 border-b border-[#303234] p-4"><h3 class="font-semibold">Episodes</h3><select id="season-select" aria-label="Select season" class="max-w-36 rounded-lg border border-[#303234] bg-[#101112] px-3 py-2 text-sm">${seasons.map((s) => `<option${s === season ? ' selected' : ''}>${escapeHtml(s ?? '')}</option>`).join('')}</select></div><div class="max-h-[28rem] divide-y divide-[#303234] overflow-y-auto">${episodes.map((v, i) => `<button type="button" data-episode="${escapeHtml(v.id)}" class="flex w-full items-start gap-3 p-3 text-left transition hover:bg-[#222426] ${v.id === selectedEpisode ? 'bg-[#E9B477]/10' : ''}"><span class="pt-0.5 text-xs text-[#6E7376]">${String(i + 1).padStart(2, '0')}</span><span class="min-w-0 flex-1"><span class="block truncate text-sm">${escapeHtml(v.name.replace(/\\.[^.]+$/, ''))}</span><span class="mt-1 block text-xs text-[#6E7376]">${formatSize(v.size)}</span></span><span class="text-[#E9B477]">${v.id === selectedEpisode ? '▶' : ''}</span></button>`).join('')}</div></aside>
    </div>
  </div>`;
  grid.querySelector('#series-back')?.addEventListener('click', () => { closeSeries(); rerender(); });
  grid.querySelector('#season-select')?.addEventListener('change', renderSeriesDetail);
  grid.querySelectorAll('button[data-episode]').forEach((btn) => {
    const button = /** @type {HTMLButtonElement} */ (btn);
    button.addEventListener('click', () => { selectedEpisode = button.dataset.episode ?? null; renderSeriesDetail(); });
  });
}
