// @ts-check
import { BASE } from '../cdp.mjs';

const ROOTS = ['series', 'tv', 'shows', 'tv shows'];

/** @param {string} p */
const parts = (p) => p.replaceAll('\\', '/').split('/');

/** @param {any} v */
function showOf(v) {
  const seg = parts(v.path);
  const root = seg.findIndex((s) => ROOTS.includes(s.toLowerCase()));
  return root < 0 ? null : (seg[root + 1] || '').replace(/[._]+/g, ' ').trim() || null;
}

/** @param {any} v */
function seasonOf(v) {
  const seg = parts(v.path);
  const root = seg.findIndex((s) => ROOTS.includes(s.toLowerCase()));
  const folder = seg[root + 2] || '';
  const file = v.name.match(/\bS(\d{1,2})\b/i)?.[1];
  return /^s\d+$/i.test(folder) ? `Season ${Number(folder.slice(1))}`
    : /^season\s*\d+$/i.test(folder) ? folder.replace(/season\s*/i, 'Season ')
      : file ? `Season ${Number(file)}` : (folder || 'Season 1');
}

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function watch(h) {
  const api = await (await fetch(`${BASE}/api/videos`)).json();
  const videos = Array.isArray(api) ? api : api.videos;
  const series = videos.filter((v) => (v.category || 'Other') === 'Series');
  if (series.length === 0) throw new Error('no series in catalog');

  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid .card').length === 8`, 'cards on page 1');
  await h.click('.chip[data-category="Series"]');
  await h.waitFor(`document.querySelector('.chip[data-category="Series"]').classList.contains('active')`, 'series filter');
  await h.waitFor(`!!document.querySelector('#video-grid .card[data-show]')`, 'series card');
  const show = await h.evaluate(`document.querySelector('#video-grid .card[data-show]').dataset.show`);
  await h.click(`#video-grid .card[data-show="${show}"]`);
  await h.waitFor(`!document.getElementById('watch-view').classList.contains('hidden')`, 'watch view');

  const season = await h.evaluate(`document.getElementById('season-select')?.value ?? ''`);
  const expected = series.filter((v) => showOf(v) === show && seasonOf(v) === season).length;
  const rows = await h.evaluate(`document.querySelectorAll('#watch-sidebar button[data-ep]').length`);
  if (rows !== expected || rows < 1) throw new Error(`sidebar shows ${rows} episodes, expected ${expected}`);

  const first = await h.evaluate(`document.querySelector('#watch-sidebar button[data-ep]').dataset.ep`);
  await h.waitFor(`document.getElementById('player').src.includes(${JSON.stringify(`/video/${first}`)})`, 'first episode loaded');
  if (rows > 1) {
    const second = await h.evaluate(`document.querySelectorAll('#watch-sidebar button[data-ep]')[1].dataset.ep`);
    await h.click(`#watch-sidebar button[data-ep="${second}"]`);
    await h.waitFor(`document.getElementById('player').src.includes(${JSON.stringify(`/video/${second}`)})`, 'episode swap');
  }

  const options = await h.evaluate(`document.getElementById('season-select').options.length`);
  if (options > 1) {
    const before = await h.evaluate(`[...document.querySelectorAll('#watch-sidebar button[data-ep]')].map((b) => b.dataset.ep).join('|')`);
    await h.evaluate(`(() => { const s = document.getElementById('season-select'); s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const after = await h.evaluate(`[...document.querySelectorAll('#watch-sidebar button[data-ep]')].map((b) => b.dataset.ep).join('|')`);
    if (after === before) throw new Error('season switch did not re-render episodes');
  }

  await h.evaluate(`document.getElementById('autoplay-toggle').click()`);
  if (await h.evaluate(`localStorage.getItem('hm:autoplay')`) !== '0') throw new Error('autoplay toggle did not persist');

  await h.click('#back-btn');
  await h.waitFor(`!document.getElementById('list-view').classList.contains('hidden')`, 'grid visible');
  await h.waitFor(`document.getElementById('watch-view').classList.contains('hidden')`, 'watch hidden');
  await h.waitFor(`document.getElementById('page-summary').textContent.startsWith('Showing 1')`, 'back on page 1');
}
