import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { VIDEO_ROOT } from './config.ts';
import { isVideo } from './mime.ts';
import { encodeId } from './ids.ts';
import { categoryOf, classifyMedia, cleanTitle } from './classify.ts';
import type { Video } from '../types.ts';

// Walk VIDEO_ROOT recursively, following directory symlinks.
async function* walkDir(dir: string, seen: Set<string>): AsyncIterable<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const st = await fsp.stat(full);
        if (st.isDirectory()) {
          const real = await fsp.realpath(full);
          if (seen.has(real)) continue;
          seen.add(real);
          yield* walkDir(full, seen);
          continue;
        }
        yield full;
        continue;
      } catch {
        continue;
      }
    }
    if (entry.isDirectory()) {
      yield* walkDir(full, seen);
      continue;
    }
    if (entry.isFile()) {
      yield full;
      continue;
    }
  }
}

// Paths come from readdir() under VIDEO_ROOT, so they are trusted and do not
// go through safeResolve() — that guard applies to client-supplied ids.
export async function listVideos(options: { followSymlinks?: boolean } = {}): Promise<Video[]> {
  const follow = options.followSymlinks !== false;
  const videos: Video[] = [];
  const seen = new Set<string>();
  if (follow) {
    try {
      const realRoot = await fsp.realpath(VIDEO_ROOT);
      seen.add(realRoot);
    } catch {
      // ignore
    }
    for await (const fullPath of walkDir(VIDEO_ROOT, seen)) {
      const ext = path.extname(fullPath).toLowerCase();
      if (!isVideo(ext)) continue;
      try {
        const stat = await fsp.stat(fullPath);
        if (!stat.isFile()) continue;
        const relPath = path.relative(VIDEO_ROOT, fullPath);
        const name = path.basename(fullPath);
        const mediaType = classifyMedia(relPath, name);
        videos.push({
          id: encodeId(relPath),
          name,
          path: relPath,
          size: stat.size,
          title: cleanTitle(name),
          mediaType,
          category: categoryOf(mediaType),
          preview: `/catalog/previews/${encodeId(relPath)}.jpg`,
        });
      } catch {
        continue;
      }
    }
  } else {
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(VIDEO_ROOT, { recursive: true, withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Video root not found: ${VIDEO_ROOT} — serving empty list`);
        return [];
      }
      throw err;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (!entry.isFile()) continue;
      if (!isVideo(path.extname(entry.name))) continue;
      const parent = (entry as any).parentPath ?? (entry as any).path;
      const fullPath = path.join(parent, entry.name);
      const relPath = path.relative(VIDEO_ROOT, fullPath);
      try {
        const stat = await fsp.stat(fullPath);
        const mediaType = classifyMedia(relPath, entry.name);
        videos.push({
          id: encodeId(relPath),
          name: entry.name,
          path: relPath,
          size: stat.size,
          title: cleanTitle(entry.name),
          mediaType,
          category: categoryOf(mediaType),
          preview: `/catalog/previews/${encodeId(relPath)}.jpg`,
        });
      } catch {
        continue;
      }
    }
  }
  videos.sort((a, b) => a.name.localeCompare(b.name));
  return videos;
}
