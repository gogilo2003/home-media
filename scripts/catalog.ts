#!/usr/bin/env node
import {spawn} from 'node:child_process';

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {stdio: 'inherit'});
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error('failed'))));
  });
}

async function main() {
  await run('node', ['./scripts/build-catalog.mjs', ...process.argv.slice(2)]);
}
main().catch(e => { console.error(e); process.exit(1); });
