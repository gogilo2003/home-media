import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Video } from '../types.ts';

const CATALOG_INDEX = path.resolve('catalog/index.json');

export async function readCatalogVideos(): Promise<Video[]> {
  try {
    const catalog = JSON.parse(await fsp.readFile(CATALOG_INDEX, 'utf8'));
    if (!Array.isArray(catalog.videos)) return [];
    return catalog.videos.map((entry: Record<string, unknown>) => {
      const { fullPath: _fullPath, ...video } = entry;
      return video as unknown as Video;
    });
  } catch {
    return [];
  }
}

export async function readExistingMap(): Promise<Map<string, any>> {
  try {
    const raw = await fsp.readFile(CATALOG_INDEX, 'utf8');
    const meta = JSON.parse(raw);
    return new Map(Array.isArray(meta.videos) ? meta.videos.map((v: any) => [v.id, v]) : []);
  } catch {
    return new Map();
  }
}

export async function writeCatalogIndex(meta: unknown): Promise<void> {
  const dir = path.dirname(CATALOG_INDEX);
  const tmp = path.join(dir, `index.${process.pid}.tmp.json`);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(tmp, JSON.stringify(meta, null, 2), 'utf8');
  await fsp.rename(tmp, CATALOG_INDEX);
}
