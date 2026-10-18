// Headless-Chrome CDP driver for the UI scenarios. Zero dependencies:
// Node's built-in WebSocket plus the DevTools protocol.
// @ts-check
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort, makeInput, waitFor } from './cdp-helpers.mjs';

export const BASE = process.env.BASE || 'http://localhost:3000';

export async function launch() {
  const port = /** @type {number} */ (await freePort());
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-cdp-'));
  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio', '--hide-scrollbars',
    '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*', 'about:blank',
  ], { stdio: 'ignore' });
  let version = /** @type {any} */ (null);
  for (let i = 0; i < 50 && !version; i += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!version) throw new Error('Chrome DevTools endpoint never came up');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = () => resolve(undefined);
    ws.onerror = () => reject(new Error('DevTools WebSocket failed'));
  });
  let seq = 0;
  /** @type {Map<number, (msg: any) => void>} */
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data));
    const settle = msg.id ? pending.get(msg.id) : undefined;
    if (settle) {
      pending.delete(msg.id);
      settle(msg);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attach = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const sessionId = attach.result.sessionId;
  const cmd = (method, params = {}) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const res = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) throw new Error(`evaluate failed: ${expression}`);
    return res.result?.result?.value;
  };
  return {
    cmd,
    evaluate,
    goto: (url) => cmd('Page.navigate', { url }),
    waitFor: (expression, label, timeout) => waitFor(evaluate, expression, label, timeout),
    ...makeInput({ cmd, evaluate }),
    close() {
      ws.close();
      chrome.kill('SIGTERM');
      setTimeout(() => {
        try {
          fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        } catch { /* profile dir is best-effort cleanup */ }
      }, 300);
    },
  };
}
