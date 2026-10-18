// @ts-check
import { el, escapeHtml, formatSize } from './util.js';
import { videoById } from './state.js';
import { clearQueue, isQueued, moveInQueue, queueIds, removeFromQueue, subscribe } from './queue.js';

const drawer = el('queue-drawer');
const overlay = el('queue-overlay');
const items = el('queue-items');
const badge = el('queue-badge');
const count = el('queue-drawer-count');
const playBtn = /** @type {HTMLButtonElement} */ (el('queue-play'));

/** @type {(id: string) => void} */
let play = () => {};
let open = false;
/** @type {string[]} */
let current = [];

/** @param {boolean} next */
function setOpen(next) {
  open = next;
  drawer.classList.toggle('translate-x-full', !next);
  drawer.setAttribute('aria-hidden', String(!next));
  overlay.classList.toggle('hidden', !next);
  if (next) render();
}

/** Toggle the drawer from a keyboard shortcut (M7). */
export function toggleQueueDrawer() { setOpen(!open); }

/** @param {string} id */
function itemMarkup(id) {
  const video = videoById(id);
  const name = video ? video.name.replace(/\.[^.]+$/, '') : id;
  const size = video ? formatSize(video.size) : '';
  return `<div data-queue-item data-id="${escapeHtml(id)}" class="flex items-center gap-1 p-3">
    <button type="button" data-queue-play-item class="min-w-0 flex-1 text-left">
      <span class="block truncate text-sm font-medium text-[#F4F0E9]">${escapeHtml(name)}</span>
      <span class="mt-0.5 block truncate text-xs text-[#6E7376]">${escapeHtml(size)}</span>
    </button>
    <button type="button" data-queue-up aria-label="Move up" class="qbtn">↑</button>
    <button type="button" data-queue-down aria-label="Move down" class="qbtn">↓</button>
    <button type="button" data-queue-remove aria-label="Remove" class="qbtn">×</button>
  </div>`;
}

/** @param {HTMLElement} item */
function wireItem(item) {
  const id = item.getAttribute('data-id') ?? '';
  item.querySelector('[data-queue-play-item]')?.addEventListener('click', () => { play(id); setOpen(false); });
  item.querySelector('[data-queue-up]')?.addEventListener('click', () => moveInQueue(id, -1));
  item.querySelector('[data-queue-down]')?.addEventListener('click', () => moveInQueue(id, 1));
  item.querySelector('[data-queue-remove]')?.addEventListener('click', () => removeFromQueue(id));
}

function render() {
  badge.textContent = String(current.length);
  badge.classList.toggle('hidden', current.length === 0);
  count.textContent = current.length ? `· ${current.length} title${current.length === 1 ? '' : 's'}` : '';
  playBtn.disabled = current.length === 0;
  document.querySelectorAll('[data-queue-add]').forEach((node) => {
    node.classList.toggle('queued', isQueued(node.getAttribute('data-queue-add') ?? ''));
  });
  items.innerHTML = current.length
    ? current.map(itemMarkup).join('')
    : '<p class="p-6 text-sm text-[#A2A3A3]">Your queue is empty. Add titles from the library.</p>';
  items.querySelectorAll('[data-queue-item]').forEach((node) => wireItem(/** @type {HTMLElement} */ (node)));
}

/** @param {(id: string) => void} onPlay */
export function initQueue(onPlay) {
  play = onPlay;
  el('queue-btn').addEventListener('click', () => setOpen(!open));
  el('queue-close').addEventListener('click', () => setOpen(false));
  el('queue-clear').addEventListener('click', clearQueue);
  el('queue-play').addEventListener('click', () => { const first = queueIds()[0]; if (first) { play(first); setOpen(false); } });
  overlay.addEventListener('click', () => setOpen(false));
  subscribe((ids) => { current = ids; render(); });
}
