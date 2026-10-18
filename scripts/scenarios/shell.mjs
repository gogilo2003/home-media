// @ts-check
import { BASE } from '../cdp.mjs';

export const SHELL_CHECKS = ['search-input', 'loading', 'error', 'empty', 'hero', 'video-grid', 'video-list', 'page-summary', 'page-buttons'];

/** @param {Awaited<ReturnType<import('../cdp.mjs').launch>>} h */
export async function shell(h) {
  await h.goto(`${BASE}/`);
  for (const id of SHELL_CHECKS) {
    await h.waitFor(`!!document.getElementById(${JSON.stringify(id)})`, `#${id}`);
  }
  await h.waitFor(`document.getElementById('loading').classList.contains('hidden')`, 'boot finished');
  if (!await h.evaluate(`document.body.textContent.includes('Keyboard shortcuts')`)) throw new Error('footer stubs missing');
}
