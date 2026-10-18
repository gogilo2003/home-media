// @ts-check
/** Persistent playback queue: an ordered, de-duplicated list of video ids in
 * `localStorage` (`hm:queue`). Subscribers drive the badge, the drawer and,
 * from M7, the player's next/previous context. */

export const QUEUE_KEY = 'hm:queue';
const MAX = 200;

/** @type {string[]} */
let ids = read();
/** @type {Set<(ids: string[]) => void>} */
const listeners = new Set();

/** @returns {string[]} */
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function notify() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  for (const fn of listeners) fn(ids);
}

/** @param {(ids: string[]) => void} fn @returns {() => void} */
export function subscribe(fn) {
  listeners.add(fn);
  fn(ids);
  return () => listeners.delete(fn);
}

/** @returns {string[]} */
export function queueIds() { return [...ids]; }
/** @returns {number} */
export function queueCount() { return ids.length; }
/** @param {string} id @returns {boolean} */
export function isQueued(id) { return ids.includes(id); }

/** @param {string} id */
export function addToQueue(id) {
  if (!id || ids.includes(id)) return;
  ids = [...ids, id].slice(-MAX);
  notify();
}

/** @param {string} id */
export function removeFromQueue(id) {
  if (!ids.includes(id)) return;
  ids = ids.filter((item) => item !== id);
  notify();
}

/** @param {string} id */
export function toggleQueued(id) { isQueued(id) ? removeFromQueue(id) : addToQueue(id); }

export function clearQueue() {
  if (ids.length === 0) return;
  ids = [];
  notify();
}

/** @param {string} id @param {number} delta */
export function moveInQueue(id, delta) {
  const at = ids.indexOf(id);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= ids.length) return;
  const [moved] = ids.splice(at, 1);
  if (moved !== undefined) ids.splice(to, 0, moved);
  notify();
}

/** Neighbour id for M7's next/previous. @param {string} id @param {number} delta @returns {string | null} */
export function neighborOf(id, delta) {
  const at = ids.indexOf(id);
  return at < 0 ? null : ids[at + delta] ?? null;
}
