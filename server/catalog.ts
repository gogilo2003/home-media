import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { VIDEO_ROOT } from './config.ts';
import { isVideo } from './mime.ts';
import { encodeId } from './ids.ts';
import { classifyMedia, cleanTitle } from './classify.ts';
import type { MediaType, Video } from '../types.ts';

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

export interface CatalogOptions {
  root?: string;
  followSymlinks?: boolean;
}

export interface CatalogVideo extends Video {
  fullPath: string;
}

export interface Catalog {
  root: string;
  total: number;
  byMediaType: Record<MediaType, number>;
  videos: CatalogVideo[];
}

export async function catalogVideos(options: CatalogOptions = {}): Promise<Catalog> {
  const root = options.root ? path.resolve(options.root) : VIDEO_ROOT;
  const follow = options.followSymlinks !== false;
  const videos: CatalogVideo[] = [];
  const seen = new Set<string>();
  if (follow) {
    try {
      const realRoot = await fsp.realpath(root);
      seen.add(realRoot);
    } catch {
      // ignore
    }
    for await (const fullPath of walkDir(root, seen)) {
      const ext = path.extname(fullPath).toLowerCase();
      if (!isVideo(ext)) continue;
      try {
        const stat = await fsp.stat(fullPath);
        if (!stat.isFile()) continue;
        const relPath = path.relative(root, fullPath);
        const name = path.basename(fullPath);
        const mediaType = classifyMedia(relPath, name);
        videos.push({
          id: encodeId(relPath),
          name,
          path: relPath,
          fullPath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          title: cleanTitle(name),
          mediaType,
        });
      } catch {
        continue;
      }
    }
  } else {
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(root, { recursive: true, withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          root,
          total: 0,
          byMediaType: { movie: 0, series: 0, music: 0, other: 0 },
          videos: [],
        };
      }
      throw err;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (!entry.isFile()) continue;
      if (!isVideo(path.extname(entry.name))) continue;
      const parent = (entry as any).parentPath ?? (entry as any).path;
      const fullPath = path.join(parent, entry.name);
      const relPath = path.relative(root, fullPath);
      try {
        const stat = await fsp.stat(fullPath);
        const mediaType = classifyMedia(relPath, entry.name);
        videos.push({
          id: encodeId(relPath),
          name: entry.name,
          path: relPath,
          fullPath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          title: cleanTitle(entry.name),
          mediaType,
        });
      } catch {
        continue;
      }
    }
  }
  videos.sort((a, b) => a.path.localeCompare(b.path));

  const byMediaType: Record<MediaType, number> = { movie: 0, series: 0, music: 0, other: 0 };
  for (const v of videos) {
    if (v.mediaType) byMediaType[v.mediaType]++;
  }

  return {
    root,
    total: videos.length,
    byMediaType,
    videos,
  };
}
