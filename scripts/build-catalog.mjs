#!/usr/bin/env node
import {catalogVideos} from '../server/catalog.ts';
import {buildSeriesCatalog} from '../server/series.ts';
import {readExistingMap, writeCatalogIndex} from '../server/catalog-index.ts';
import {addPreviews, hasFfmpeg, prunePreviews} from './catalog-previews.mjs';
import {enrichCaptions, enrichMetadata} from './enrich.mjs';
import {createProgress} from './progress.mjs';
import path from 'node:path';

function printHelp() {
  console.log(`Usage: npm run catalog -- [options] [path]
Options:
  --skip-previews     Skip extracting preview thumbnails
  --refresh-previews  Force re-extraction of all preview thumbnails
  --previews-only     Only update previews; do not rewrite catalog/index.json
  --prune             Remove orphaned preview images from catalog/previews/
  --no-tmdb           Skip TMDB lookups (TMDB_API_KEY is read from env only)
  --refresh-meta      Re-probe runtimes and re-query TMDB for every title
  --help, -h          Show this help message`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return printHelp();
  const previewsOnly = args.includes('--previews-only');
  const skipPreviews = args.includes('--skip-previews') || args.includes('--no-previews');
  const forcePreviews = previewsOnly || args.includes('--refresh-previews');
  const shouldPrune = args.includes('--prune') || args.includes('--clean');
  const noTmdb = args.includes('--no-tmdb') || args.includes('--no-meta');
  const refreshMeta = args.includes('--refresh-meta');
  const root = args.find(a => !a.startsWith('-')) || process.env.VIDEO_ROOT || './videos';

  console.error(`Scanning ${root} ...`);
  const c = await catalogVideos({root, followSymlinks: true});
  console.error(`Found ${c.total} videos`);

  const enriched = await enrichCaptions(c.videos, await readExistingMap());
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

  await enrichMetadata(enriched, {refreshMeta, useTmdb: !noTmdb});

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
