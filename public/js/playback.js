// @ts-check
import { videoEl } from './controls.js';
import { autoplayOn } from './series.js';
import { commands, currentVideo, isLoaded, nextId } from './player.js';
import { isWatched, markDone, saveResume, saveThrottled } from './resume.js';

const video = videoEl();

/** Persist the current position, or retire it once the item is watched.
 * @param {boolean} force */
function save(force) {
  const item = currentVideo();
  if (!item || !isLoaded() || video.currentTime <= 0) return;
  if (!video.currentSrc.endsWith(`/video/${item.id}`)) return;
  if (isWatched(item, video.currentTime)) markDone(item.id);
  else if (force) saveResume(item.id, video.currentTime);
  else saveThrottled(item.id, video.currentTime);
}

export function initPlayback() {
  video.addEventListener('timeupdate', () => save(false));
  video.addEventListener('pause', () => save(true));
  window.addEventListener('beforeunload', () => save(true));
  video.addEventListener('ended', () => {
    const item = currentVideo();
    if (autoplayOn() && nextId()) commands.next();
    if (item) markDone(item.id);
  });
}
