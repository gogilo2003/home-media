// @ts-check
import { BASE } from '../cdp.mjs';

export const CARD_KEYS = `[...document.querySelectorAll('#video-grid button, #video-list button')].map((b) => b.dataset.id || b.dataset.show).join('|')`;
export const CARD_COUNT = `document.querySelectorAll('#video-grid button, #video-list button').length`;

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function browse(h) {
  const api = await (await fetch(`${BASE}/api/videos`)).json();
  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid button').length === 8`, '8 cards on page 1');
  if (!await h.evaluate(`!document.getElementById('hero').classList.contains('hidden')`)) throw new Error('hero should be visible');
  const page1 = await h.evaluate(CARD_KEYS);
  const first = await h.evaluate(`(() => { const b = document.querySelector('#video-grid button[data-id]'); return b ? { id: b.dataset.id, name: b.dataset.name } : null; })()`);
  if (!first) throw new Error('expected at least one non-series card to drive search');
  const word = (first.name.replace(/\.[^.]+$/, '').split(/[^a-z0-9]+/i)
    .find((w) => w.length >= 4 && !/^\d+$/.test(w)) ?? '').trim();
  if (!word) throw new Error(`no searchable word in "${first.name}"`);
  await h.click('#search-input');
  await h.type('#search-input', word);
  await h.waitFor(`!!document.querySelector('#video-grid button[data-id="${first.id}"]')`, 'search keeps the matching title');
  await h.clear('#search-input');
  await h.waitFor(`${CARD_COUNT} === 8`, 'search cleared');
  if (await h.evaluate(CARD_KEYS) !== page1) throw new Error('page 1 changed after the search round-trip');
  if (api.counts.Movies > 0) {
    await h.click('.chip[data-category="Movies"]');
    await h.waitFor(`document.querySelector('.chip[data-category="Movies"]').classList.contains('active')`, 'Movies chip active');
    await h.waitFor(`${CARD_COUNT} === ${Math.min(8, api.counts.Movies)}`, 'movie cards');
  }
  if (api.counts.Music === 0) {
    await h.click('.chip[data-category="Music"]');
    await h.waitFor(`!document.getElementById('empty').classList.contains('hidden')`, 'empty state for Music');
  }
  await h.click('.chip[data-category="All"]');
  await h.waitFor(`${CARD_COUNT} === 8`, 'back to All');
  await h.click('#page-buttons button[data-page="2"]');
  await h.waitFor(`document.querySelector('#page-buttons .page-btn.active')?.dataset.page === '2'`, 'page 2 active');
  const page2 = await h.evaluate(CARD_KEYS);
  if (page2 === page1) throw new Error('page 2 shows the same cards as page 1');
  if (page2.split('|').length !== 8) throw new Error(`page 2 rendered ${page2.split('|').length} cards, expected 8`);
}
