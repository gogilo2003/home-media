// @ts-check
/** @typedef {import('../../types.ts').Video} Video */

/** Persisted slice of `state` — the search query stays transient. */
export const STATE_KEY = 'hm:browse-state';

const SORTS = ['recent', 'name', 'size'];
const VIEWS = ['grid', 'list'];

export const state = {
  mediaType: 'All',
  genre: 'All',
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

/** @returns {Video[]} */
export function catalogVideos() { return catalog; }

/** @param {string} id @returns {Video | undefined} */
export function videoById(id) { return catalog.find((video) => video.id === id); }

export function filteredVideos() {
  const query = state.query.trim().toLowerCase();
  const result = catalog.filter((video) =>
    (state.mediaType === 'All' || video.mediaType === state.mediaType)
    && (state.genre === 'All' || (video.genres ?? []).includes(state.genre))
    && (query.length === 0 || video.name.toLowerCase().includes(query)));
  if (state.sort === 'name') return result.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === 'size') return result.sort((a, b) => b.size - a.size);
  return result.sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0));
}

export function saveState() {
  try {
    const { mediaType, genre, sort, page, view } = state;
    localStorage.setItem(STATE_KEY, JSON.stringify({ mediaType, genre, sort, page, view }));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

export function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return;
    if (typeof saved.mediaType === 'string') state.mediaType = saved.mediaType;
    if (typeof saved.genre === 'string') state.genre = saved.genre;
    if (SORTS.includes(saved.sort)) state.sort = saved.sort;
    if (VIEWS.includes(saved.view)) state.view = saved.view;
    if (Number.isInteger(saved.page) && saved.page >= 1) state.page = saved.page;
  } catch {
    /* corrupt or unavailable storage — keep defaults */
  }
}
