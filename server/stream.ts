import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Stats } from 'node:fs';
import { send, type Headers } from './http.ts';
import { decodeId, safeResolve } from './ids.ts';
import { isVideo, mimeFor } from './mime.ts';
import { parseRange } from './range.ts';
import type { ByteRange } from '../types.ts';

export async function streamVideo(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  let relPath: string;
  try { relPath = decodeId(id); } catch { return send(res, 400, 'Bad id'); }
  let fullPath: string;
  try { fullPath = safeResolve(relPath); } catch { return send(res, 403, 'Forbidden'); }
  const ext = path.extname(fullPath).toLowerCase();
  if (!isVideo(ext)) return send(res, 403, 'Forbidden');

  let stat: Stats;
  try {
    stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
  } catch { return send(res, 404, 'Not found'); }

  const base: Headers = { 'Content-Type': mimeFor(ext), 'Accept-Ranges': 'bytes' };
  let opts: ByteRange | undefined;
  if (req.headers.range) {
    const r = parseRange(req.headers.range, stat.size);
    if (!r) return send(res, 416, 'Range Not Satisfiable', { ...base, 'Content-Range': `bytes */${stat.size}` });
    opts = r;
    res.writeHead(206, {
      ...base,
      'Content-Range': `bytes ${r.start}-${r.end}/${stat.size}`,
      'Content-Length': r.end - r.start + 1,
    });
  } else {
    res.writeHead(200, { ...base, 'Content-Length': stat.size });
  }

  const stream = fs.createReadStream(fullPath, opts);
  stream.on('error', () => (res.headersSent ? res.destroy() : send(res, 500, 'Server error')));
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}