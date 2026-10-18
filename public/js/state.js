// @ts-check
/** @typedef {import('../../types.ts').Video} Video */

/** Persisted slice of `state` — the search query stays transient. */
export const STATE_KEY = 'hm:browse-state';

const CATEGORIES = ['All', 'Movies', 'Series', 'Music', 'Other'];
const SORTS = ['recent', 'name', 'size'];
const VIEWS = ['grid', 'list'];

export const state = {
  category: 'All',
  query: '',
  sort: 'recent',
  page: 1,
  view: /** @type {'grid' | 'list'} */ ('grid'),
};

/** @type {Video[]} */
let catalog = [];

export async function loadCatalog() {
  const res = await fetch('/api/videos');
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  const data = /** @type {any} */ (await res.json());
  catalog = Array.isArray(data) ? data : (Array.isArray(data?.videos) ? data.videos : []);
}

export function filteredVideos() {
  const query = state.query.trim().toLowerCase();
  return catalog.filter((video) =>
    (state.category === 'All' || (video.category || 'Other') === state.category)
    && (query.length === 0 || video.name.toLowerCase().includes(query)));
}

export function saveState() {
  try {
    const { category, sort, page, view } = state;
    localStorage.setItem(STATE_KEY, JSON.stringify({ category, sort, page, view }));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

export function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return;
    if (CATEGORIES.includes(saved.category)) state.category = saved.category;
    if (SORTS.includes(saved.sort)) state.sort = saved.sort;
    if (VIEWS.includes(saved.view)) state.view = saved.view;
    if (Number.isInteger(saved.page) && saved.page >= 1) state.page = saved.page;
  } catch {
    /* corrupt or unavailable storage — keep defaults */
  }
}
