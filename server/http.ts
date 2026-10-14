import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import { PUBLIC_DIR } from './config.ts';
import { staticTypeFor } from './mime.ts';

export type Headers = Record<string, string | number>;

export function send(res: ServerResponse, status: number, body: string, headers: Headers = {}): void {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export async function serveStatic(res: ServerResponse, file: string): Promise<void> {
  const fullPath = path.join(PUBLIC_DIR, file);
  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'Content-Type': staticTypeFor(path.extname(file)),
      'Content-Length': stat.size,
    });
    fs.createReadStream(fullPath).pipe(res);
  } catch {
    send(res, 404, 'Not found');
  }
}