#!/usr/bin/env node
import {catalogVideos} from '../server/catalog.ts';
import {findCaptionsForVideo} from '../server/captions.ts';
import {addPreviews} from './catalog-previews.mjs';
import {createProgress} from './progress.mjs';
import fsp from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  const previewsOnly = args.includes('--previews-only');
  const forcePreviews = previewsOnly || args.includes('--refresh-previews');
  const root = args.find(arg => !arg.startsWith('--')) || process.env.VIDEO_ROOT || './videos';
  console.error(`Scanning ${root} ...`);
  const c = await catalogVideos({root, followSymlinks: true});
  console.error(`Found ${c.total} videos`);
  const captionsBar = createProgress(c.total, 'captions');
  const enriched = [];
  for (let i=0; i<c.videos.length; i++) {
    const v = c.videos[i];
    try {
      const captions = await findCaptionsForVideo(v.fullPath, v.path);
      enriched.push({...v, captions: captions.length? captions: undefined});
    } catch {
      enriched.push({...v});
    }
    captionsBar.render(v.name);
  }
  captionsBar.end('Captions done');
  const previewDir = path.resolve('catalog/previews');
  await fsp.mkdir(previewDir, {recursive: true});
  const previewsBar = createProgress(c.total, 'previews');
  await addPreviews(enriched, previewDir, forcePreviews, (video) => {
    previewsBar.render(video.preview ? video.name : `${video.name} (no preview)`);
  });
  previewsBar.end('Previews done');
  if (previewsOnly) {
    console.log('Previews refreshed; catalog/index.json was not changed.');
    return;
  }
  const byShow = new Map();
  for (const v of enriched) {
    if (v.category === 'Series') {
      const parts = v.path.split('/');
      if (parts.length >= 4) {
        const show = parts[2];
        const season = parts[3];
        if (!byShow.has(show)) byShow.set(show, new Map());
        const smap = byShow.get(show);
        if (!smap.has(season)) smap.set(season, []);
        smap.get(season).push(v);
      }
    }
  }
  const series = [];
  for (const [show, smap] of byShow.entries()) {
    const seasons = [];
    for (const [season, eps] of smap.entries()) {
      eps.sort((a,b)=>a.path.localeCompare(b.path));
      seasons.push({name: season, preview: eps[0]?.preview, episodes: eps.map(e=>({name:e.name, path:e.path, fullPath:e.fullPath, size:e.size, captions:e.captions, preview:e.preview}))});
    }
    seasons.sort((a,b)=>a.name.localeCompare(b.name, undefined,{numeric:true}));
    series.push({title: show, showPath: 'Videos/Series/' + show, preview: seasons[0]?.preview, seasons});
  }
  const meta = {
    version: '1.0',
    updated: new Date().toISOString(),
    videos: enriched,
    series,
    counts: c.byCategory
  };
  meta.counts.total = c.total;
  await fsp.mkdir('catalog', {recursive:true});
  await fsp.writeFile(path.join('catalog', 'index.json'), JSON.stringify(meta, null, 2));
  console.log('Catalog written to catalog/index.json');
  console.log('Total:', meta.counts.total, 'Movies:', meta.counts.Movies, 'Series:', meta.counts.Series, 'Music:', meta.counts.Music, 'Other:', meta.counts.Other);
}
main().catch(e=>{console.error(e); process.exit(1);});
