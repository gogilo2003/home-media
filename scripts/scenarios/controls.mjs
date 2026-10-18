// @ts-check
import { BASE } from '../cdp.mjs';

const CLEAN = `['hm:queue', 'hm:autoplay'].forEach((k) => localStorage.removeItem(k));
  Object.keys(localStorage).filter((k) => k.startsWith('hm:pos:') || k.startsWith('hm:done:')).forEach((k) => localStorage.removeItem(k))`;
const SRC = (id) => `document.getElementById('player').src.includes(${JSON.stringify(`/video/${id}`)})`;
const POS = (id) => `Number(localStorage.getItem(${JSON.stringify(`hm:pos:${id}`)}))`;
const READY = `document.getElementById('player').readyState >= 1`;

/** @param {string} name */
function searchWord(name) {
  return (name.replace(/\.[^.]+$/, '').split(/[^a-z0-9]+/i)
    .find((w) => w.length >= 4 && !/^\d+$/.test(w)) ?? '').trim();
}

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function controls(h) {
  const api = await (await fetch(`${BASE}/api/videos`)).json();
  const videos = Array.isArray(api) ? api : api.videos;
  const playable = videos.filter((v) => /\.(mp4|webm|m4v)$/i.test(v.name));
  if (playable.length < 2) throw new Error('need two browser-playable videos');
  const [first, second] = playable;
  const word = searchWord(first.name);
  if (!word) throw new Error(`no search word in "${first.name}"`);

  await h.goto(`${BASE}/`);
  await h.evaluate(`${CLEAN}; localStorage.setItem('hm:queue', ${JSON.stringify(JSON.stringify([first.id, second.id]))})`);
  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid .card').length === 8`, 'cards on page 1');

  await h.click('#search-input');
  await h.type('#search-input', word);
  await h.waitFor(`!!document.querySelector('#video-grid .card[data-id="${first.id}"]')`, 'first card');
  await h.click(`#video-grid .card[data-id="${first.id}"]`);
  await h.waitFor(SRC(first.id), 'first video loaded');
  await h.waitFor(`!!document.querySelector('.plyr__control[data-nav="next"]')`, 'next button present');
  if (!(await h.evaluate(`document.querySelector('.plyr__control[data-nav="previous"]').disabled`))) {
    throw new Error('previous should be disabled on the first queued item');
  }
  await h.waitFor(READY, 'first video metadata');

  await h.evaluate(`(() => { const p = document.getElementById('player'); p.currentTime = 30; p.pause(); p.dispatchEvent(new Event('timeupdate')); })()`);
  await h.waitFor(`${POS(first.id)} >= 29`, 'resume position stored');
  const saved = await h.evaluate(POS(first.id));

  await h.press('n', 'KeyN');
  await h.waitFor(SRC(second.id), 'n advanced to the next queued item');
  await h.waitFor(READY, 'second video metadata');
  await h.evaluate(`(() => { const p = document.getElementById('player'); p.pause(); p.currentTime = 30; })()`);
  await h.press('ArrowLeft', 'ArrowLeft');
  await h.waitFor(`document.getElementById('player').currentTime < 24`, 'ArrowLeft seeks backward');

  await h.click('#back-btn');
  await h.waitFor(`!document.getElementById('list-view').classList.contains('hidden')`, 'back on the grid');
  await h.click(`#video-grid .card[data-id="${first.id}"]`);
  await h.waitFor(SRC(first.id), 'first video reopened');
  await h.waitFor(READY, 'reopened metadata');
  await h.waitFor(`Math.abs(document.getElementById('player').currentTime - ${saved}) < 4`, 'resume position restored');

  await h.evaluate(`document.getElementById('player').dispatchEvent(new Event('ended'))`);
  await h.waitFor(SRC(second.id), 'ended advanced with autoplay on');

  await h.evaluate(`localStorage.setItem('hm:autoplay', '0')`);
  const before = await h.evaluate(`document.getElementById('player').src`);
  await h.evaluate(`document.getElementById('player').dispatchEvent(new Event('ended'))`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (await h.evaluate(`document.getElementById('player').src`) !== before) throw new Error('ended advanced with autoplay off');

  await h.click('#shortcuts-btn');
  await h.waitFor(`!document.getElementById('shortcuts-modal').classList.contains('hidden')`, 'shortcuts modal opens');
  await h.press('Escape', 'Escape');
  await h.waitFor(`document.getElementById('shortcuts-modal').classList.contains('hidden')`, 'shortcuts modal closes');
  await h.evaluate(CLEAN);
}
