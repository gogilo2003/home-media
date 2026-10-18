// @ts-check
import { el } from './util.js';
import { commands } from './player.js';
import { toggleQueueDrawer } from './queueui.js';

const modal = el('shortcuts-modal');
const search = /** @type {HTMLInputElement} */ (el('search-input'));

/** @param {boolean} open */
function setOpen(open) {
  modal.classList.toggle('hidden', !open);
  modal.classList.toggle('flex', open);
}

/** @param {EventTarget | null} target @returns {boolean} */
function typing(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** @param {KeyboardEvent} event */
function handle(event) {
  if (typing(event.target)) return;
  const key = event.key;
  if (key === ' ') { event.preventDefault(); commands.togglePlay(); return; }
  if (key === 'ArrowLeft') { event.preventDefault(); commands.seek(-10); return; }
  if (key === 'ArrowRight') { event.preventDefault(); commands.seek(10); return; }
  if (key === 'ArrowUp') { event.preventDefault(); commands.volume(0.1); return; }
  if (key === 'ArrowDown') { event.preventDefault(); commands.volume(-0.1); return; }
  if (key === 'f') { commands.fullscreen(); return; }
  if (key === 'm') { commands.toggleMute(); return; }
  if (key === 'n') { commands.next(); return; }
  if (key === 'p') { commands.previous(); return; }
  if (key === 'q') { toggleQueueDrawer(); return; }
  if (key === '/') { event.preventDefault(); search.focus(); return; }
  if (key === 'Escape') setOpen(false);
}

export function initShortcuts() {
  el('shortcuts-btn').addEventListener('click', () => setOpen(true));
  el('shortcuts-close').addEventListener('click', () => setOpen(false));
  modal.addEventListener('click', (event) => { if (event.target === modal) setOpen(false); });
  document.addEventListener('keydown', handle);
}
