// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
/** Resume store: the watched position per video under `hm:pos:{id}` (seconds)
 * plus an `hm:done:{id}` marker once an item is finished (≥95% watched). */

const POS = 'hm:pos:';
const DONE = 'hm:done:';
const WATCHED = 0.95;
const SAVE_GAP = 5000;

/** Last save timestamp per id — throttles `timeupdate` writes. @type {Map<string, number>} */
const savedAt = new Map();

/** @param {string} key @returns {number | null} */
function readNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** @param {string} id @returns {number | null} */
export function resumeOf(id) { return readNumber(POS + id); }

/** @param {string} id @returns {boolean} */
export function isDone(id) {
  try { return localStorage.getItem(DONE + id) === '1'; } catch { return false; }
}

/** @param {string} id */
export function clearResume(id) {
  try { localStorage.removeItem(POS + id); } catch { /* storage unavailable */ }
}

/** Store a position and clear any stale finished marker. @param {string} id @param {number} seconds */
export function saveResume(id, seconds) {
  try {
    localStorage.setItem(POS + id, String(Math.floor(seconds)));
    localStorage.removeItem(DONE + id);
  } catch { /* storage unavailable */ }
  savedAt.set(id, Date.now());
}

/** Throttled save — at most once every 5s. @param {string} id @param {number} seconds */
export function saveThrottled(id, seconds) {
  if (Date.now() - (savedAt.get(id) ?? 0) < SAVE_GAP) return;
  saveResume(id, seconds);
}

/** Mark finished and forget the resume point. @param {string} id */
export function markDone(id) {
  try {
    localStorage.setItem(DONE + id, '1');
    localStorage.removeItem(POS + id);
  } catch { /* storage unavailable */ }
}

/** @param {Video} video @param {number} position @returns {number} */
export function minutesLeft(video, position) {
  return Math.max(1, Math.ceil(((video.runtime ?? 0) - position) / 60));
}

/** @param {Video} video @param {number} seconds @returns {boolean} */
export function isWatched(video, seconds) {
  return Boolean(video.runtime) && seconds / (video.runtime ?? 1) >= WATCHED;
}
