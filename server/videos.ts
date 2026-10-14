import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import { VIDEO_ROOT } from './config.ts';
import { isVideo } from './mime.ts';
import { encodeId } from './ids.ts';
import type { Video } from '../types.ts';

// Paths come from readdir() under VIDEO_ROOT, so they are trusted and do not
// go through safeResolve() — that guard applies to client-supplied ids.
export async function listVideos(): Promise<Video[]> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(VIDEO_ROOT, { recursive: true, withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Video root not found: ${VIDEO_ROOT} — serving empty list`);
      return [];
    }
    throw err;
  }

  const videos: Video[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isVideo(path.extname(entry.name))) continue;
    const fullPath = path.join(entry.parentPath, entry.name);
    const relPath = path.relative(VIDEO_ROOT, fullPath);
    try {
      const stat = await fsp.stat(fullPath);
      videos.push({ id: encodeId(relPath), name: entry.name, path: relPath, size: stat.size });
    } catch {
      // Entry vanished or is unreadable — skip it rather than fail the listing.
    }
  }
  videos.sort((a, b) => a.name.localeCompare(b.name));
  return videos;
}