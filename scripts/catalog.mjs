#!/usr/bin/env node
import {catalogVideos} from '../server/catalog.ts';

async function main() {
  const args = process.argv.slice(2);
  const root = args.find(a => !a.startsWith('-')) || process.env.VIDEO_ROOT || './videos';
  const format = args.includes('--json') ? 'json' : 'text';
  const list = args.includes('--list') || args.includes('-l');
  const catalog = await catalogVideos({root, followSymlinks: true});
  if (format === 'json') {
    console.log(JSON.stringify(catalog, null, 2));
    return;
  }
  console.log(`Root: ${catalog.root}`);
  console.log(`Total: ${catalog.total}`);
  console.log(`By category:`);
  console.log(`  Movies: ${catalog.byCategory.Movies}`);
  console.log(`  Music:  ${catalog.byCategory.Music}`);
  console.log(`  Series: ${catalog.byCategory.Series}`);
  console.log(`  Other:  ${catalog.byCategory.Other}`);
  if (list) {
    const cats = ['Movies','Music','Series','Other'];
    for (const c of cats) {
      console.log(`\n=== ${c} (${catalog.byCategory[c]}) ===`);
      for (const v of catalog.videos) {
        if (v.category === c) console.log(v.path);
      }
    }
  }
}

main().catch(e=>{console.error(e); process.exit(1);});
