// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { getPlayer, videoEl } from './controls.js';
import { initNavButtons, syncNavButtons } from './navbuttons.js';
import { neighbor, setContext } from './navigation.js';
import { isDone, resumeOf, saveResume } from './resume.js';

const video = videoEl();

/** @type {Video | null} */
let current = null;
/** @type {boolean} */
let loaded = false;
/** @type {(id: string) => void} */
let play = () => {};

/** @returns {Video | null} */
export function currentVideo() { return current; }
/** @returns {boolean} */
export function isLoaded() { return loaded; }
/** @returns {string | null} */
export function nextId() { return current ? neighbor(current.id, 1) : null; }
/** @returns {string | null} */
export function previousId() { return current ? neighbor(current.id, -1) : null; }

/** @param {number} delta */
function go(delta) {
  const id = current ? neighbor(current.id, delta) : null;
  if (id) play(id);
}

/** Player commands shared by the nav buttons and the keyboard shortcuts. */
export const commands = {
  togglePlay() { const p = getPlayer(); if (p) p.togglePlay(); else if (video.paused) video.play().catch(() => {}); else video.pause(); },
  /** @param {number} delta */
  seek(delta) { video.currentTime = Math.max(0, video.currentTime + delta); },
  /** @param {number} delta */
  volume(delta) { const p = getPlayer(); const level = Math.min(1, Math.max(0, (p ? p.volume : video.volume) + delta)); if (p) p.volume = level; else video.volume = level; },
  toggleMute() { const p = getPlayer(); if (p) p.muted = !p.muted; else video.muted = !video.muted; },
  fullscreen() { getPlayer()?.fullscreen.toggle(); },
  next() { go(1); },
  previous() { go(-1); },
};

/** Persist the current playback position immediately (before switching away). */
export function flushPosition() {
  if (current && video.currentTime > 0) saveResume(current.id, video.currentTime);
}

/** Point the player at a video: flush the outgoing position, set the
 * next/previous context and seek to any saved resume position once metadata
 * arrives. @param {Video} item */
export function trackVideo(item) {
  if (current && current.id !== item.id) flushPosition();
  current = item;
  loaded = false;
  setContext(item);
  const position = isDone(item.id) ? null : resumeOf(item.id);
  video.addEventListener('loadedmetadata', function ready() {
    video.removeEventListener('loadedmetadata', ready);
    loaded = true;
    if (position !== null && (!video.duration || position < video.duration - 1)) video.currentTime = position;
  });
  syncNavButtons();
}

/** @param {(id: string) => void} onPlay */
export function initNavigation(onPlay) {
  play = onPlay;
  initNavButtons({ go, previous: () => previousId() !== null, next: () => nextId() !== null });
  syncNavButtons();
}
