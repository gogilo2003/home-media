import {spawn} from 'node:child_process';

export function hasFfprobe() {
  return new Promise((resolve) => {
    const child = spawn('ffprobe', ['-version'], {stdio: 'ignore'});
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}

function probeDuration(fullPath) {
  return new Promise((resolve) => {
    const child = spawn('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fullPath],
      {stdio: ['ignore', 'pipe', 'ignore']});
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.once('error', () => resolve(undefined));
    child.once('exit', (code) => {
      if (code !== 0) return resolve(undefined);
      const secs = Number(out.trim());
      resolve(Number.isFinite(secs) && secs > 0 ? Math.round(secs) : undefined);
    });
  });
}

/**
 * Fill `video.runtime` (whole seconds) from ffprobe, 4 at a time.
 * A failed probe leaves the field omitted — the build never aborts.
 */
export async function addRuntimes(videos, {force = false, onVideo} = {}) {
  let next = 0;
  const workers = Array.from({length: Math.min(4, videos.length)}, async () => {
    while (next < videos.length) {
      const video = videos[next++];
      if (force || video.runtime === undefined) {
        const secs = await probeDuration(video.fullPath);
        if (secs !== undefined) video.runtime = secs;
      }
      onVideo?.(video);
    }
  });
  await Promise.all(workers);
}
