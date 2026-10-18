// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { escapeHtml, formatSize, previewMarkup, runtimeOf } from './util.js';
import { isDone, minutesLeft, resumeOf } from './resume.js';
import { seriesInfo } from './paths.js';

export { seriesInfo };

const AUTOPLAY_KEY = 'hm:autoplay';

/** @param {Video[]} videos @returns {Map<string, Video[]>} */
export function groupSeries(videos) {
  const shows = new Map();
  for (const video of videos) {
    if (video.mediaType !== 'series') continue;
    const info = seriesInfo(video);
    if (info) shows.set(info.show, [...(shows.get(info.show) || []), video]);
  }
  return shows;
}

/** @param {Video[]} episodes */
export function episodeSort(episodes) {
  return [...episodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

export function autoplayOn() {
  try { return localStorage.getItem(AUTOPLAY_KEY) !== '0'; } catch { return true; }
}

/** @param {boolean} on */
export function setAutoplay(on) {
  try { localStorage.setItem(AUTOPLAY_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
}

/** Episode status: now playing / watched / remaining / runtime-or-size.
 * @param {Video} video @param {string | null} activeId */
function statusOf(video, activeId) {
  const position = resumeOf(video.id);
  const left = video.runtime && position !== null ? `${minutesLeft(video, position)} min left` : '';
  if (video.id === activeId && left) return `Now playing · ${left}`;
  if (isDone(video.id)) return 'Watched';
  if (left) return left;
  return video.runtime ? runtimeOf(video.runtime) : formatSize(video.size);
}

/**
 * Episodes sidebar for the Watch view.
 * @param {HTMLElement} host
 * @param {Video[]} episodes every episode of the show
 * @param {{ season: string, selectedId: string | null, onSeason: (season: string) => void, onPick: (id: string) => void }} opts
 */
export function renderEpisodes(host, episodes, opts) {
  const seasons = [...new Set(episodes.map((video) => seriesInfo(video)?.season).filter(Boolean))]
    .sort((a, b) => (a ?? '').localeCompare(b ?? '', undefined, { numeric: true }));
  const season = seasons.includes(opts.season) ? opts.season : seasons[0] ?? '';
  const list = episodeSort(episodes.filter((video) => seriesInfo(video)?.season === season));
  const rows = list.map((video, index) => {
    const active = video.id === opts.selectedId;
    return `<button type="button" data-ep="${escapeHtml(video.id)}" class="flex w-full items-center gap-3 p-3 text-left transition hover:bg-[#222426]${active ? ' bg-[#E9B477]/10' : ''}"><span class="relative h-[45px] w-20 shrink-0 overflow-hidden rounded-md bg-[#08090A]">${previewMarkup(video.preview)}</span><span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium${active ? ' text-[#E9B477]' : ''}">${String(index + 1).padStart(2, '0')} · ${escapeHtml(video.name.replace(/\.[^.]+$/, ''))}</span><span class="mt-0.5 block truncate text-xs text-[#6E7376]">${escapeHtml(statusOf(video, opts.selectedId))}</span>${active ? '<span class="mt-1 block h-0.5 w-10 rounded bg-[#E9B477]"></span>' : ''}</span></button>`;
  }).join('');
  host.innerHTML = `<div class="flex items-center justify-between gap-3 border-b border-[#303234] p-4"><h2 class="font-semibold">Episodes</h2><select id="season-select" aria-label="Select season" class="rounded-lg border border-[#303234] bg-[#101112] px-3 py-2 text-sm">${seasons.map((s) => `<option${s === season ? ' selected' : ''}>${escapeHtml(s ?? '')}</option>`).join('')}</select></div><div class="max-h-[28rem] divide-y divide-[#303234] overflow-y-auto">${rows}</div><label class="flex items-center justify-between gap-3 border-t border-[#303234] p-4 text-sm text-[#F4F0E9]"><span>Autoplay next episode</span><input id="autoplay-toggle" type="checkbox" class="h-4 w-4 accent-[#E9B477]"${autoplayOn() ? ' checked' : ''}></label>`;
  host.querySelectorAll('button[data-ep]').forEach((btn) => btn.addEventListener('click', () => opts.onPick(btn.getAttribute('data-ep') ?? '')));
  const select = /** @type {HTMLSelectElement | null} */ (host.querySelector('#season-select'));
  if (select) select.addEventListener('change', () => opts.onSeason(select.value));
  const toggle = /** @type {HTMLInputElement | null} */ (host.querySelector('#autoplay-toggle'));
  if (toggle) toggle.addEventListener('change', () => setAutoplay(toggle.checked));
}
