#!/usr/bin/env node
// UI scenario harness — headless Chrome over CDP, zero dependencies.
import { launch } from './cdp.mjs';
import { shell } from './scenarios/shell.mjs';
import { browse } from './scenarios/browse.mjs';
import { preview } from './scenarios/preview.mjs';
import { player } from './scenarios/player.mjs';
import { watch } from './scenarios/watch.mjs';
import { queue } from './scenarios/queue.mjs';
import { controls } from './scenarios/controls.mjs';

const scenarios = { shell, browse, preview, player, watch, queue, controls };
const scenario = process.argv[2];

if (!scenario || !scenarios[scenario]) {
  console.error(`Usage: node scripts/verify-ui.mjs <${Object.keys(scenarios).join('|')}>`);
  process.exit(1);
}

const h = await launch();
try {
  await scenarios[scenario](h);
  console.log(`PASS ${scenario}`);
} catch (err) {
  console.error(`FAIL ${scenario}: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  h.close();
}
