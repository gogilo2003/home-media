// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { catalogVideos } from './state.js';
import { episodeSort, seriesInfo } from './series.js';
import { neighborOf } from './queue.js';

/** Current episode order when watching a series, else null (queue context).
 * @type {string[] | null} */
let episodes = null;

/** Set the next/previous context: the show's episode order for a series,
 * otherwise the persistent queue (M6).
 * @param {Video} video */
export function setContext(video) {
  const show = seriesInfo(video)?.show;
  episodes = show
    ? episodeSort(catalogVideos().filter((item) => seriesInfo(item)?.show === show)).map((item) => item.id)
    : null;
}

/** @param {string} id @param {number} delta @returns {string | null} */
export function neighbor(id, delta) {
  if (!episodes) return neighborOf(id, delta);
  const at = episodes.indexOf(id);
  return at < 0 ? null : episodes[at + delta] ?? null;
}
