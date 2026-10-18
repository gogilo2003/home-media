// @ts-check
import { BASE } from '../cdp.mjs';

// The shared overlay only lives inside a card while a preview is active, so
// presence under #video-grid is the reliable "previewing" signal.
const IN_CARD = `document.querySelector('#video-grid #preview-video')`;
const ACTIVE = `!!${IN_CARD}`;

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function preview(h) {
  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid .card[data-id]').length === 8`, '8 cards on page 1');
  const cards = await h.evaluate(`[...document.querySelectorAll('#video-grid .card[data-id]')].map((c) => c.dataset.id)`);
  if (cards.length < 2) throw new Error('need >=2 cards for preview test');
  const first = `#video-grid .card[data-id="${cards[0]}"]`;
  const second = `#video-grid .card[data-id="${cards[1]}"]`;
  await h.hover(first);
  await h.waitFor(ACTIVE, 'overlay shown on hover');
  await h.waitFor(`!${IN_CARD}.paused`, 'preview playing');
  await h.waitFor(`${IN_CARD}.currentTime > 0`, 'currentTime advances');
  await h.hover(second);
  await h.waitFor(`${IN_CARD}?.closest('.card')?.dataset.id === ${JSON.stringify(cards[1])}`, 'overlay reused on second card');
  await h.hover('#hero');
  await h.waitFor(`!${ACTIVE}`, 'overlay hidden on leave');
  await h.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await h.goto(`${BASE}/`);
  await h.waitFor(`document.querySelectorAll('#video-grid .card[data-id]').length === 8`, 'cards after reload');
  await h.hover(first);
  await new Promise((r) => setTimeout(r, 800));
  if (await h.evaluate(ACTIVE)) throw new Error('coarse-pointer should leave the preview untouched');
  await h.cmd('Emulation.setTouchEmulationEnabled', { enabled: false });
}
