import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Video } from '../types.ts';

const CATALOG_INDEX = path.resolve('catalog/index.json');

export async function readCatalogVideos(): Promise<Video[]> {
  const catalog = JSON.parse(await fsp.readFile(CATALOG_INDEX, 'utf8'));
  if (!Array.isArray(catalog.videos)) throw new Error('Invalid catalog: videos must be an array');
  return catalog.videos.map((entry: Record<string, unknown>) => {
    const { fullPath: _fullPath, ...video } = entry;
    return video as unknown as Video;
  });
}
