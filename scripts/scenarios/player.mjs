// @ts-check
import { BASE } from '../cdp.mjs';

/** @param {string} name */
function searchWord(name) {
  return (name.replace(/\.[^.]+$/, '').split(/[^a-z0-9]+/i)
    .find((w) => w.length >= 4 && !/^\d+$/.test(w)) ?? '').trim();
}

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function player(h) {
  const api = await (await fetch(`${BASE}/api/videos`)).json();
  const videos = Array.isArray(api) ? api : api.videos;
  const target = videos.find((v) => (v.captions || []).length);
  if (!target) throw new Error('no captioned video in catalog');
  const word = searchWord(target.name);
  if (!word) throw new Error(`no search word in "${target.name}"`);
  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid button').length === 8`, 'cards');
  await h.click('#search-input');
  await h.type('#search-input', word);
  await h.waitFor(`!!document.querySelector('#video-grid button[data-id="${target.id}"]')`, 'target card');
  await h.click(`#video-grid button[data-id="${target.id}"]`);
  await h.waitFor(`!document.getElementById('player-view').classList.contains('hidden')`, 'player view');
  await h.waitFor(`!!document.querySelector('#player-view .plyr')`, 'plyr root');
  await h.waitFor(`document.querySelectorAll('#player track').length > 0`, 'captions track attached');
  await h.click('#player-view .plyr__control[data-plyr="settings"]');
  await h.waitFor(`!!document.querySelector('.plyr__menu__container [data-plyr="speed"]')`, 'speed menu reachable');
}
