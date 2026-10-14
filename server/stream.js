import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { send } from './http.js';
import { decodeId, safeResolve } from './ids.js';
import { isVideo, mimeFor } from './mime.js';
import { parseRange } from './range.js';

export async function streamVideo(req, res, id) {
  let relPath;
  try { relPath = decodeId(id); } catch { return send(res, 400, 'Bad id'); }
  let fullPath;
  try { fullPath = safeResolve(relPath); } catch { return send(res, 403, 'Forbidden'); }
  const ext = path.extname(fullPath).toLowerCase();
  if (!isVideo(ext)) return send(res, 403, 'Forbidden');

  let stat;
  try {
    stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
  } catch { return send(res, 404, 'Not found'); }

  const base = { 'Content-Type': mimeFor(ext), 'Accept-Ranges': 'bytes' };
  let opts;
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