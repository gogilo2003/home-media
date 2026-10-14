import fsp from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from './http.ts';
import { decodeId, safeResolve } from './ids.ts';
import { isVideo, mimeFor } from './mime.ts';
import { isBrowserSafe } from './codecs.ts';
import { streamTranscoded } from './transcode.ts';
import { serveFile as serveOriginal } from './file-stream.ts';

export async function streamVideo(req: IncomingMessage, res: ServerResponse, id: string, force = false): Promise<void> {
  let relPath: string;
  try { relPath = decodeId(id); } catch { return send(res, 400, 'Bad id'); }
  let fullPath: string;
  try { fullPath = safeResolve(relPath); } catch { return send(res, 403, 'Forbidden'); }
  const ext = path.extname(fullPath).toLowerCase();
  if (!isVideo(ext)) return send(res, 403, 'Forbidden');

  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
  } catch { return send(res, 404, 'Not found'); }
  if (!force && await isBrowserSafe(fullPath, ext)) {
    console.log(`Serving original: ${id}`);
    return serveOriginal(req, res, fullPath, mimeFor(ext));
  }
  return streamTranscoded(req, res, fullPath, id, force);
}
