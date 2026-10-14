import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { finished } from 'node:stream/promises';

function args(input: string, output: string) {
  return [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast',
    '-crf', '23', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level:v', '4.1',
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4', output,
  ];
}

export async function transcodeToFile(input: string, output: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args(input, output), { stdio: 'ignore' });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
  if ((await fsp.stat(output)).size === 0) throw new Error('ffmpeg produced an empty file');
}

export function streamTranscode(res: ServerResponse, input: string, cacheTemp?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args(input, 'pipe:1'), { stdio: ['ignore', 'pipe', 'ignore'] });
    const cache = cacheTemp ? fs.createWriteStream(cacheTemp) : undefined;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      cache?.destroy();
      if (res.headersSent) res.destroy();
      reject(error);
    };
    child.once('error', fail);
    cache?.once('error', fail);
    res.once('close', () => { if (!res.writableEnded) fail(new Error('client disconnected')); });
    child.once('spawn', () => {
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
      child.stdout.pipe(res);
      if (cache) child.stdout.pipe(cache);
    });
    child.once('close', async (code) => {
      if (code !== 0) return fail(new Error(`ffmpeg exited ${code}`));
      try {
        if (cache) await finished(cache);
        if (!settled) { settled = true; resolve(); }
      } catch (error) { fail(error as Error); }
    });
  });
}
