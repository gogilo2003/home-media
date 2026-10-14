import fsp from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from './http.ts';
import { safeResolve } from './ids.ts';

export async function serveCaption(_req: IncomingMessage, res: ServerResponse, videoIdEncoded: string, captionName: string): Promise<void> {
  try {
    const rel = Buffer.from(videoIdEncoded, 'utf8').toString('utf8');
    const decoded = decodeURIComponent(rel);
    const videoRel = decoded;
    const full = safeResolve(videoRel);
    const dir = path.dirname(full);
    const candidates = [dir, path.join(dir, 'Subs'), path.join(dir, 'subs'), path.join(dir, 'Subtitles'), path.join(dir, 'subtitles')];
    for (const d of candidates) {
      const capPath = path.join(d, captionName);
      try {
        const stat = await fsp.stat(capPath);
        if (stat.isFile()) {
          const ext = path.extname(capPath).toLowerCase();
          const ct = ext === '.vtt' ? 'text/vtt; charset=utf-8' : 'application/x-subrip; charset=utf-8';
          res.writeHead(200, { 'Content-Type': ct, 'Content-Length': stat.size });
          const stream = (await import('node:fs')).createReadStream(capPath);
          stream.on('error', () => (res.headersSent ? res.destroy() : send(res, 500, 'Server error')));
          res.on('close', () => stream.destroy());
          stream.pipe(res);
          return;
        }
      } catch {
        continue;
      }
    }
    return send(res, 404, 'Not found');
  } catch {
    return send(res, 400, 'Bad request');
  }
}
