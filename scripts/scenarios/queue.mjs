// @ts-check
import { BASE } from '../cdp.mjs';

const CARDS = `document.querySelectorAll('#video-grid .card[data-id]').length === 8`;
const ITEMS = `document.querySelectorAll('#queue-items [data-queue-item]').length`;
const ORDER = `[...document.querySelectorAll('#queue-items [data-queue-item]')].map((n) => n.dataset.id).join(',')`;
const SETTLED = `getComputedStyle(document.getElementById('queue-drawer')).transform === 'none'`;

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function queue(h) {
  await h.goto(`${BASE}/`);
  await h.evaluate(`localStorage.removeItem('hm:queue')`);
  await h.goto(`${BASE}/`);
  await h.waitFor(CARDS, '8 cards on page 1');

  const ids = await h.evaluate(`[...document.querySelectorAll('#video-grid .card[data-id]')].map((c) => c.dataset.id)`);
  if (ids.length < 2) throw new Error('need >=2 cards for queue test');
  const [first, second] = ids;

  await h.click(`#video-grid .card[data-id="${first}"] [data-queue-add]`);
  await h.waitFor(`document.getElementById('queue-badge').textContent === '1'`, 'badge shows 1');
  await h.click('#queue-btn');
  await h.waitFor(SETTLED, 'drawer settled');
  await h.waitFor(`${ITEMS} === 1`, 'drawer shows one item');
  const queued = await h.evaluate(`document.querySelector('#queue-items [data-queue-item]').dataset.id`);
  if (queued !== first) throw new Error(`queued ${queued}, expected ${first}`);

  await h.goto(`${BASE}/`);
  await h.waitFor(CARDS, 'cards after reload');
  await h.waitFor(`document.getElementById('queue-badge').textContent === '1'`, 'badge survives reload');

  await h.click(`#video-grid .card[data-id="${second}"] [data-queue-add]`);
  await h.waitFor(`document.getElementById('queue-badge').textContent === '2'`, 'badge shows 2');
  await h.click('#queue-btn');
  await h.waitFor(SETTLED, 'drawer settled');
  await h.waitFor(`${ITEMS} === 2`, 'drawer shows two items');
  if (await h.evaluate(ORDER) !== `${first},${second}`) throw new Error('insertion order wrong');

  await h.click(`#queue-items [data-queue-item][data-id="${first}"] [data-queue-down]`);
  await h.waitFor(`${ORDER} === ${JSON.stringify(`${second},${first}`)}`, 'reorder applied');

  await h.goto(`${BASE}/`);
  await h.waitFor(CARDS, 'cards after reorder reload');
  await h.click('#queue-btn');
  await h.waitFor(SETTLED, 'drawer settled');
  await h.waitFor(`${ITEMS} === 2`, 'drawer after reorder reload');
  if (await h.evaluate(ORDER) !== `${second},${first}`) throw new Error('reorder did not persist');

  await h.click(`#queue-items [data-queue-item][data-id="${second}"] [data-queue-play-item]`);
  await h.waitFor(`!document.getElementById('watch-view').classList.contains('hidden')`, 'watch opens from queue');
  await h.waitFor(`document.getElementById('player').src.includes(${JSON.stringify(`/video/${second}`)})`, 'player loads chosen id');
  await h.click('#back-btn');
  await h.waitFor(`!document.getElementById('list-view').classList.contains('hidden')`, 'back on the grid');

  await h.click('#queue-btn');
  await h.waitFor(SETTLED, 'drawer settled');
  await h.waitFor(`${ITEMS} === 2`, 'drawer reopened');
  await h.click(`#queue-items [data-queue-item][data-id="${second}"] [data-queue-remove]`);
  await h.waitFor(`document.getElementById('queue-badge').textContent === '1'`, 'badge back to 1');
  await h.click('#queue-clear');
  await h.waitFor(`document.getElementById('queue-badge').classList.contains('hidden')`, 'badge hidden after clear');
  await h.evaluate(`localStorage.removeItem('hm:queue')`);
}
