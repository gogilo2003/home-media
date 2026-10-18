// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el } from './util.js';
import { catalogVideos, videoById } from './state.js';
import { groupSeries, renderEpisodes, seriesInfo } from './series.js';
import { loadCaptions } from './controls.js';
import { flushPosition, trackVideo } from './player.js';
import { renderInfo } from './watchinfo.js';

const view = el('watch-view');
const listView = el('list-view');
const player = /** @type {HTMLVideoElement} */ (el('player'));
const crumb = el('watch-crumb');
const layout = el('watch-layout');
const sidebar = el('watch-sidebar');
const info = el('watch-info');

/** @type {Video | null} */
let current = null;
/** @type {string} */
let season = '';
/** @param {Video} video */
function isSeries(video) { return (video.category || 'Other') === 'Series'; }

/** @param {string} name */
function stripExt(name) { return name.replace(/\.[^.]+$/, ''); }

/** @param {() => void} onBack */
export function initWatch(onBack) {
  el('back-btn').addEventListener('click', () => {
    flushPosition();
    player.pause();
    player.removeAttribute('src');
    player.load();
    view.classList.add('hidden');
    listView.classList.remove('hidden');
    onBack();
  });
}

/** @param {string} id */
export function openWatch(id) {
  const video = videoById(id);
  if (!video) return;
  const series = isSeries(video) ? seriesInfo(video) : null;
  crumb.textContent = series ? series.show : stripExt(video.name);
  season = series?.season ?? '';
  listView.classList.add('hidden');
  view.classList.remove('hidden');
  selectVideo(video);
  renderSidebar();
  renderInfo(info, video, openWatch);
}

/** @param {Video} video */
function selectVideo(video) {
  trackVideo(video);
  current = video;
  player.src = `/video/${video.id}`;
  loadCaptions(video.captions ?? []);
  player.play().catch(() => {});
}

function renderSidebar() {
  const video = current;
  if (!video) return;
  const episodes = isSeries(video) ? groupSeries(catalogVideos()).get(seriesInfo(video)?.show ?? '') ?? [] : [];
  sidebar.classList.toggle('hidden', episodes.length === 0);
  layout.classList.toggle('lg:grid-cols-[minmax(0,1fr)_24rem]', episodes.length > 0);
  if (episodes.length === 0) return;
  renderEpisodes(sidebar, episodes, {
    season,
    selectedId: video.id,
    onSeason: (value) => { season = value; renderSidebar(); },
    onPick: (episodeId) => {
      const episode = videoById(episodeId);
      if (episode) { selectVideo(episode); renderSidebar(); }
    },
  });
}
