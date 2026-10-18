// @ts-check
/** Previous/Next buttons injected into the Plyr control bar (M7). The player
 * module owns the context; this module only renders and dispatches. */

const PREV_ICON = 'M6 6h2v12H6zm3.5 6l8.5 6V6z';
const NEXT_ICON = 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z';

/** @type {(delta: number) => void} */
let go = () => {};
/** @type {() => boolean} */
let hasPrevious = () => false;
/** @type {() => boolean} */
let hasNext = () => false;

/** @param {string} type @param {string} label @param {string} icon */
function navButton(type, label, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'plyr__controls__item plyr__control';
  button.dataset.nav = type;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg role="img" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${icon}"/></svg>`;
  button.addEventListener('click', () => go(type === 'next' ? 1 : -1));
  return button;
}

/** Disable a button when there is no neighbour in the current context. */
export function syncNavButtons() {
  const prev = document.querySelector('[data-nav="previous"]');
  const next = document.querySelector('[data-nav="next"]');
  if (prev instanceof HTMLButtonElement) prev.disabled = !hasPrevious();
  if (next instanceof HTMLButtonElement) next.disabled = !hasNext();
}

/** @param {{ go: (delta: number) => void, previous: () => boolean, next: () => boolean }} options */
export function initNavButtons(options) {
  go = options.go;
  hasPrevious = options.previous;
  hasNext = options.next;
  const bar = document.querySelector('.plyr__controls');
  const playButton = bar?.querySelector('[data-plyr="play"]');
  if (!bar || !playButton || bar.querySelector('[data-nav]')) return;
  playButton.insertAdjacentElement('afterend', navButton('next', 'Next', NEXT_ICON));
  playButton.insertAdjacentElement('afterend', navButton('previous', 'Previous', PREV_ICON));
}
