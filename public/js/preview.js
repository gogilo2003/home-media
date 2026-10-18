// @ts-check
import { el } from './util.js';

const START_AT = 8;        // seconds into the file the preview begins
const SEEK_TIMEOUT = 1500; // give up and keep the poster if the seek stalls past this
const HOVER_DELAY = 600;   // ms a pointer must linger before the preview arms

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = window.matchMedia('(hover: none)');
export const previewDisabled = () => reducedMotion.matches || coarsePointer.matches;

/** The one shared overlay video — never two instances. */
const video = /** @type {HTMLVideoElement} */ (el('preview-video'));

let armTimer = /** @type {number | null} */ (null);
let seekTimer = /** @type {number | null} */ (null);
let frame = /** @type {HTMLDivElement | null} */ (null);

function clearTimers() {
  if (armTimer !== null) { clearTimeout(armTimer); armTimer = null; }
  if (seekTimer !== null) { clearTimeout(seekTimer); seekTimer = null; }
}

function hide() {
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.classList.add('hidden');
  video.remove();
  frame = null;
}

/** @param {HTMLElement} card */
function start(card) {
  if (previewDisabled()) return;
  const id = card.dataset.id;
  const target = card.querySelector(':scope > div');
  if (!id || !(target instanceof HTMLDivElement)) return;
  hide();
  frame = target;
  target.appendChild(video);
  video.classList.remove('hidden');
  video.src = `/video/${id}`;
  video.play().catch(() => { });
  seekTimer = window.setTimeout(hide, SEEK_TIMEOUT);
}

/** @param {HTMLElement} container */
export function wirePreview(container) {
  if (previewDisabled()) return;
  container.querySelectorAll('.card[data-id]').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      if (previewDisabled()) return;
      if (armTimer !== null) clearTimeout(armTimer);
      armTimer = window.setTimeout(() => start(/** @type {HTMLElement} */ (card)), HOVER_DELAY);
    });
    card.addEventListener('mouseleave', () => {
      clearTimers();
      hide();
    });
  });
}

video.addEventListener('loadedmetadata', () => { video.currentTime = START_AT; });
video.addEventListener('playing', () => {
  if (seekTimer !== null) { clearTimeout(seekTimer); seekTimer = null; }
  if (frame) frame.querySelector('img[data-preview]')?.classList.add('preview-hidden');
});
