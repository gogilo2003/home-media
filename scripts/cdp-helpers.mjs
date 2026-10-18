// CDP session helpers shared by every UI scenario. Real input events only.
// @ts-check
import net from 'node:net';

/** Virtual key codes for the non-printable keys the scenarios dispatch. */
const keyCodes = { Backspace: 8, Enter: 13, Escape: 27, Tab: 9, ' ': 32 };

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = /** @type {import('node:net').AddressInfo} */ (srv.address()).port;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * @param {(expression: string) => Promise<any>} evaluate
 * @param {string} expression @param {string} label @param {number} [timeout]
 */
export async function waitFor(evaluate, expression, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await evaluate(expression)) return;
    if (Date.now() > deadline) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * @param {{
 *   cmd: (method: string, params?: Record<string, unknown>) => Promise<any>,
 *   evaluate: (expression: string) => Promise<any>,
 * }} cdp
 */
export function makeInput({ cmd, evaluate }) {
  return {
    /** @param {string} selector */
    async click(selector) {
      const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (!box) throw new Error(`click target not found: ${selector}`);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await cmd('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
      }
    },
    /** Dispatch real mouse movement onto a selector's centre. @param {string} selector */
    async hover(selector) {
      const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (!box) throw new Error(`hover target not found: ${selector}`);
      await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
    },
    /** @param {string} selector @param {string} text */
    async type(selector, text) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
      await cmd('Input.insertText', { text });
    },
    /** @param {string} key @param {string} code @param {number} [modifiers] */
    async press(key, code, modifiers = 0) {
      const keyCode = keyCodes[key] ?? key.toUpperCase().charCodeAt(0);
      const base = { key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
      await cmd('Input.dispatchKeyEvent', { ...base, type: 'keyDown', text: key.length === 1 ? key : '' });
      await cmd('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
    },
    /** Select-all then delete, via real key events. @param {string} selector */
    async clear(selector) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
      await this.press('a', 'KeyA', 2); // Ctrl+A
      await this.press('Backspace', 'Backspace');
    },
  };
}
