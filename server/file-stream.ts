import fs from 'node:fs';
import fsp from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from './http.ts';
import { parseRange } from './range.ts';

export async function serveFile(req: IncomingMessage, res: ServerResponse, file: string, mime: string): Promise<void> {
  let size: number;
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error('not a file');
    size = stat.size;
  } catch {
    return send(res, 404, 'Not found');
  }
  const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes' };
  const range = req.headers.range ? parseRange(req.headers.range, size) : undefined;
  if (req.headers.range && !range) {
    return send(res, 416, 'Range Not Satisfiable', { ...headers, 'Content-Range': `bytes */${size}` });
  }
  if (range) {
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${range.start}-${range.end}/${size}`, 'Content-Length': range.end - range.start + 1 });
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': size });
  }
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(file, range ?? undefined);
  stream.once('error', () => (res.headersSent ? res.destroy() : send(res, 500, 'Server error')));
  res.once('close', () => stream.destroy());
  stream.pipe(res);
}
