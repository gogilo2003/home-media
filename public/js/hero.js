// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el, escapeHtml, metaOf } from './util.js';
import { resumeOf } from './resume.js';
import { seriesInfo } from './series.js';

const hero = el('hero');

/**
 * Hero / continue-watching. With no resume history yet, the featured title
 * is simply the first title of the current filter.
 * @param {Video[]} videos current filter, ungrouped
 * @param {(id: string, name: string) => void} play
 * @param {(video: Video) => void} openShow
 */
export function renderHero(videos, play, openShow) {
  const featured = videos[0];
  if (!featured) {
    hero.classList.add('hidden');
    return;
  }
  hero.classList.remove('hidden');
  const info = (featured.category || 'Other') === 'Series' ? seriesInfo(featured) : null;
  const title = info ? info.show : stripExt(featured.name);
  const position = resumeOf(featured.id);
  const minutesLeft = position === null || !featured.runtime ? null
    : Math.max(1, Math.ceil(featured.runtime / 60 - position / 60));
  const progress = info
    ? `${info.season} · ${stripExt(featured.name)}${minutesLeft === null ? '' : ` — ${minutesLeft} min left`}`
    : `${stripExt(featured.name)}${minutesLeft === null ? '' : ` — ${minutesLeft} min left`}`;
  hero.innerHTML = `
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#E9B477]">Tonight, pick up where you left off</p>
    <h2 class="mt-3 text-2xl font-semibold sm:text-3xl">${escapeHtml(title)}</h2>
    <p class="mt-2 text-sm text-[#A2A3A3]">${escapeHtml(metaOf(featured))}</p>
    ${featured.synopsis ? `<p class="mt-4 max-w-2xl text-sm leading-6 text-[#A2A3A3]">${escapeHtml(featured.synopsis)}</p>` : ''}
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" data-hero="play" class="rounded-lg bg-[#E9B477] px-4 py-2 text-sm font-semibold text-[#101112] transition hover:opacity-90">${info ? 'Resume episode' : 'Play'}</button>
      ${info ? `<button type="button" data-hero="open" class="rounded-lg border border-[#303234] bg-[#191B1D] px-4 py-2 text-sm font-medium text-[#F4F0E9] transition hover:border-[#6E7376]">View series</button>` : ''}
      <p data-hero="progress" class="text-xs text-[#A2A3A3]${position === null ? ' hidden' : ''}">${escapeHtml(progress)}</p>
    </div>`;
  hero.querySelector('[data-hero="play"]')?.addEventListener('click', () => play(featured.id, featured.name));
  hero.querySelector('[data-hero="open"]')?.addEventListener('click', () => openShow(featured));
}

/** @param {string} name */
function stripExt(name) {
  return name.replace(/\.[^.]+$/, '');
}
