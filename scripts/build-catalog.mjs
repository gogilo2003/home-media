#!/usr/bin/env node
import {catalogVideos} from '../server/catalog.ts';
import {findCaptionsForVideo} from '../server/captions.ts';
import {buildSeriesCatalog} from '../server/series.ts';
import {readExistingMap, writeCatalogIndex} from '../server/catalog-index.ts';
import {addPreviews, hasFfmpeg, prunePreviews} from './catalog-previews.mjs';
import {createProgress} from './progress.mjs';
import path from 'node:path';

function printHelp() {
  console.log(`Usage: npm run catalog -- [options] [path]
Options:
  --skip-previews     Skip extracting preview thumbnails
  --refresh-previews  Force re-extraction of all preview thumbnails
  --previews-only     Only update previews; do not rewrite catalog/index.json
  --prune             Remove orphaned preview images from catalog/previews/
  --help, -h          Show this help message`);
}

async function enrich(videos, existing) {
  const bar = createProgress(videos.length, 'captions');
  const enriched = [];
  let reused = 0;
  for (const v of videos) {
    const prev = existing.get(v.id);
    if (prev && prev.size === v.size) {
      enriched.push({...v, captions: prev.captions, preview: prev.preview});
      reused++;
    } else {
      try {
        const caps = await findCaptionsForVideo(v.fullPath, v.path);
        enriched.push({...v, captions: caps.length ? caps : undefined, preview: prev?.preview});
      } catch { enriched.push({...v, preview: prev?.preview}); }
    }
    bar.render(v.name);
  }
  bar.end(reused > 0 ? `Captions done (${reused} cached)` : 'Captions done');
  return enriched;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return printHelp();
  const previewsOnly = args.includes('--previews-only');
  const skipPreviews = args.includes('--skip-previews') || args.includes('--no-previews');
  const forcePreviews = previewsOnly || args.includes('--refresh-previews');
  const shouldPrune = args.includes('--prune') || args.includes('--clean');
  const root = args.find(a => !a.startsWith('-')) || process.env.VIDEO_ROOT || './videos';

  console.error(`Scanning ${root} ...`);
  const c = await catalogVideos({root, followSymlinks: true});
  console.error(`Found ${c.total} videos`);

  const enriched = await enrich(c.videos, await readExistingMap());
  const previewDir = path.resolve('catalog/previews');

  if (!skipPreviews) {
    if (await hasFfmpeg()) {
      const bar = createProgress(c.total, 'previews');
      await addPreviews(enriched, previewDir, forcePreviews, (v) => bar.render(v.preview ? v.name : `${v.name} (no preview)`));
      bar.end('Previews done');
    } else {
      console.warn('Warning: ffmpeg not found in PATH; skipping preview extraction.');
    }
  }
  if (shouldPrune) await prunePreviews(enriched, previewDir);
  if (previewsOnly) return console.log('Previews refreshed; catalog/index.json was not changed.');

  const meta = {
    version: '1.0', updated: new Date().toISOString(),
    videos: enriched, series: buildSeriesCatalog(enriched),
    counts: {...c.byCategory, total: c.total}
  };
  await writeCatalogIndex(meta);
  console.log('Catalog written to catalog/index.json');
  console.log('Total:', meta.counts.total, 'Movies:', meta.counts.Movies, 'Series:', meta.counts.Series, 'Music:', meta.counts.Music, 'Other:', meta.counts.Other);
}
main().catch(e => { console.error(e); process.exit(1); });
