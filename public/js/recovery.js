// @ts-check
/** Recover from transient network stalls: when the media element errors
 * mid-stream (a dropped Wi-Fi packet, a reset connection), reload the same
 * source after a short pause and jump back to the last known position. One
 * retry per source load; cleared once playback is healthy or the app switches
 * source. */
import { videoEl } from './controls.js';

const video = videoEl();
const RETRY_DELAY = 800;

let retries = 0;
let lastPosition = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let timer = null;

/** @param {string} src */
function retry(src) {
  if (retries > 0) return;
  retries += 1;
  const at = video.currentTime || lastPosition;
  timer = setTimeout(() => {
    timer = null;
    if (video.currentSrc !== src) return;
    video.load();
    video.addEventListener('loadedmetadata', () => {
      if (at > 0) video.currentTime = at;
      video.play().catch(() => {});
    }, { once: true });
  }, RETRY_DELAY);
}

/** Forget any pending retry — call when the app points the player at a new
 * source so a stale reload cannot hijack it. */
export function resetRecovery() {
  retries = 0;
  lastPosition = 0;
  if (timer) { clearTimeout(timer); timer = null; }
}

export function initRecovery() {
  video.addEventListener('timeupdate', () => { lastPosition = video.currentTime; });
  video.addEventListener('playing', () => { retries = 0; });
  video.addEventListener('error', () => {
    if (!video.currentSrc || video.error?.code === 4) return;
    retry(video.currentSrc);
  });
}
