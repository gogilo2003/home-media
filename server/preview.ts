import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PREVIEW_DIR } from './config.ts';
import { decodeId, safeResolve } from './ids.ts';
import { serveFile } from './file-stream.ts';
import { send } from './http.ts';

export async function servePreview(req: IncomingMessage, res: ServerResponse, filename: string): Promise<void> {
  const match = /^([A-Za-z0-9_-]+)\.jpg$/.exec(filename);
  if (!match?.[1]) return send(res, 404, 'Not found');
  try { safeResolve(decodeId(match[1])); } catch { return send(res, 404, 'Not found'); }
  await serveFile(req, res, path.join(PREVIEW_DIR, `${match[1]}.jpg`), 'image/jpeg');
}
