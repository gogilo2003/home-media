// @ts-check
/** @typedef {import('../../types.ts').Video} Video */
import { el } from './util.js';
import { state, filteredVideos, saveState } from './state.js';
import { groupSeries, isSeriesOpen, openSeries, renderSeriesDetail, seriesInfo } from './series.js';
import { cardMarkup, itemsOf, rowMarkup, wireCards } from './cards.js';
import { wirePreview } from './preview.js';
import { renderHero } from './hero.js';
import { initFilters } from './filters.js';
import { PAGE_SIZE, renderPagination } from './pagination.js';

const grid = el('video-grid');
const list = el('video-list');
const empty = el('empty');
const count = el('library-count');

/** @type {(id: string, name: string) => void} */
let playVideo = () => {};

/** @param {(id: string, name: string) => void} fn */
export function setPlayHandler(fn) {
  playVideo = fn;
}

export function initBrowse() {
  initFilters(render);
  el('view-grid').addEventListener('click', () => setView('grid'));
  el('view-list').addEventListener('click', () => setView('list'));
}

/** @param {'grid' | 'list'} view */
function setView(view) {
  state.view = view;
  saveState();
  render();
}

export function render() {
  if (isSeriesOpen()) {
    grid.classList.remove('hidden');
    list.classList.add('hidden');
    renderSeriesDetail();
    return;
  }
  const videos = filteredVideos();
  count.textContent = `${videos.length} title${videos.length === 1 ? '' : 's'}`;
  const shows = groupSeries(videos);
  renderHero(videos, playVideo, (video) => {
    const show = seriesInfo(video)?.show ?? '';
    openSeries(show, shows.get(show) || [], render);
  });
  if (videos.length === 0) {
    grid.innerHTML = '';
    list.innerHTML = '';
    grid.classList.add('hidden');
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    renderPagination(0, goPage);
    return;
  }
  empty.classList.add('hidden');
  const items = itemsOf(videos, shows);
  const pageItems = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  const useGrid = state.view === 'grid';
  grid.classList.toggle('hidden', !useGrid);
  list.classList.toggle('hidden', useGrid);
  const container = useGrid ? grid : list;
  container.innerHTML = pageItems.map((item) => (useGrid ? cardMarkup(item) : rowMarkup(item))).join('');
  wireCards(container, shows, playVideo, (show, episodes) => openSeries(show, episodes, render));
  if (useGrid) wirePreview(grid);
  renderPagination(items.length, goPage);
}

/** @param {number} page */
function goPage(page) {
  state.page = page;
  saveState();
  render();
}
