import fsp from 'node:fs/promises';
import path from 'node:path';
import { VIDEO_ROOT } from './config.js';
import { isVideo } from './mime.js';
import { encodeId } from './ids.js';

// Paths come from readdir() under VIDEO_ROOT, so they are trusted and do not
// go through safeResolve() — that guard applies to client-supplied ids.
export async function listVideos() {
  let entries;
  try {
    entries = await fsp.readdir(VIDEO_ROOT, { recursive: true, withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Video root not found: ${VIDEO_ROOT} — serving empty list`);
      return [];
    }
    throw err;
  }

  const videos = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isVideo(path.extname(entry.name))) continue;
    const fullPath = path.join(entry.parentPath ?? entry.path, entry.name);
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