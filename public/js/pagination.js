// @ts-check
import { el } from './util.js';
import { state } from './state.js';

export const PAGE_SIZE = 8;

const summary = el('page-summary');
const buttons = el('page-buttons');

/** @param {number} total @param {(page: number) => void} go */
export function renderPagination(total, go) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.page > pages) state.page = pages;
  const start = total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, state.page * PAGE_SIZE);
  summary.textContent = `Showing ${start}–${end} of ${total} title${total === 1 ? '' : 's'}`;
  buttons.innerHTML = total <= PAGE_SIZE ? '' : `
    <button type="button" data-page="${state.page - 1}" class="page-btn"${state.page === 1 ? ' disabled' : ''}>Prev</button>
    ${Array.from({ length: pages }, (_, i) => i + 1)
      .map((page) => `<button type="button" data-page="${page}" class="page-btn${page === state.page ? ' active' : ''}">${page}</button>`).join('')}
    <button type="button" data-page="${state.page + 1}" class="page-btn"${state.page === pages ? ' disabled' : ''}>Next</button>`;
  buttons.querySelectorAll('button[data-page]').forEach((btn) => btn.addEventListener('click', () => {
    const page = Number(btn.getAttribute('data-page'));
    if (page >= 1 && page <= pages && page !== state.page) go(page);
  }));
}
