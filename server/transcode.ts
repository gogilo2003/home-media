import { randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TRANSCODE_CACHE_DIR, TRANSCODE_CACHE_ENABLED } from './config.ts';
import { serveFile } from './file-stream.ts';
import { streamTranscode, transcodeToFile } from './transcode-process.ts';

const active = new Map<string, Promise<void>>();
const mp4 = 'video/mp4';

async function exists(file: string): Promise<boolean> {
  try { return (await fsp.stat(file)).isFile(); } catch { return false; }
}

async function makeCache(input: string, output: string): Promise<void> {
  const temp = `${output}.${randomUUID()}.tmp.mp4`;
  try { await transcodeToFile(input, temp); await fsp.rename(temp, output); }
  finally { await fsp.rm(temp, { force: true }).catch(() => {}); }
}

async function cachedTranscode(input: string, output: string, force: boolean): Promise<void> {
  if (!force && await exists(output)) return;
  const running = active.get(output);
  if (running) { await running; if (!force && await exists(output)) return; }
  const task = makeCache(input, output);
  active.set(output, task);
  try { await task; } finally { if (active.get(output) === task) active.delete(output); }
}

export async function streamTranscoded(req: IncomingMessage, res: ServerResponse, input: string, id: string, force: boolean): Promise<void> {
  const output = path.join(TRANSCODE_CACHE_DIR, `${id}.mp4`);
  const hasRange = Boolean(req.headers.range) || req.method === 'HEAD';
  if (TRANSCODE_CACHE_ENABLED) {
    await fsp.mkdir(TRANSCODE_CACHE_DIR, { recursive: true });
    if (!force && await exists(output)) {
      console.log(`Serving transcode cache: ${id}`);
      return serveFile(req, res, output, mp4);
    }
    if (!force && active.has(output)) {
      await active.get(output);
      return serveFile(req, res, output, mp4);
    }
    if (hasRange) {
      console.log(`Transcoding to cache: ${id}`);
      await cachedTranscode(input, output, force);
      return serveFile(req, res, output, mp4);
    }
    return liveWithCache(res, input, output, id, force);
  }
  if (!hasRange) {
    console.log(`Transcoding live (cache disabled): ${id}`);
    return streamTranscode(res, input);
  }
  const temp = path.join(os.tmpdir(), `video-${randomUUID()}.mp4`);
  console.log(`Transcoding for Range request (cache disabled): ${id}`);
  try { await transcodeToFile(input, temp); await serveFile(req, res, temp, mp4); }
  finally { res.once('close', () => { void fsp.rm(temp, { force: true }); }); }
}

async function liveWithCache(res: ServerResponse, input: string, output: string, id: string, force: boolean): Promise<void> {
  const temp = `${output}.${randomUUID()}.tmp.mp4`;
  await fsp.mkdir(path.dirname(output), { recursive: true });
  const task = streamTranscode(res, input, temp).then(() => fsp.rename(temp, output));
  active.set(output, task);
  console.log(`${force ? 'Force transcoding' : 'Transcoding live'}: ${id}`);
  try { await task; } finally {
    if (active.get(output) === task) active.delete(output);
    await fsp.rm(temp, { force: true }).catch(() => {});
  }
}
