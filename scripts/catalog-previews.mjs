import {spawn} from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';

export function hasFfmpeg() {
  return new Promise(resolve => {
    const child = spawn('ffmpeg', ['-version'], {stdio: 'ignore'});
    child.once('error', () => resolve(false));
    child.once('exit', code => resolve(code === 0));
  });
}

function runFfmpeg(args) {
  return new Promise(resolve => {
    const child = spawn('ffmpeg', args, {stdio: 'ignore'});
    child.once('error', () => resolve(false));
    child.once('exit', code => resolve(code === 0));
  });
}

async function extractPreview(video, previewDir, force) {
  const output = path.join(previewDir, `${video.id}.jpg`);
  try {
    const existing = await fsp.stat(output);
    if (!force && existing.isFile() && existing.size > 0) return `/catalog/previews/${video.id}.jpg`;
  } catch {
    // Missing preview: try extracting it below.
  }
  const temp = path.join(previewDir, `${video.id}.${process.pid}.tmp.jpg`);
  for (const seek of ['600', '5', '1', '0']) {
    try {
      const ok = await runFfmpeg([
        '-hide_banner', '-loglevel', 'error', '-ss', seek, '-i', video.fullPath,
        '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', '-y', temp,
      ]);
      if (ok && (await fsp.stat(temp)).size > 0) {
        await fsp.rename(temp, output);
        return `/catalog/previews/${video.id}.jpg`;
      }
    } catch {
      // Ignore malformed, unsupported, or too-short videos.
    } finally {
      await fsp.rm(temp, {force: true}).catch(() => {});
    }
  }
  return undefined;
}

export async function addPreviews(videos, previewDir, force = false, onVideo) {
  let next = 0;
  const workers = Array.from({length: Math.min(4, videos.length)}, async () => {
    while (next < videos.length) {
      const video = videos[next++];
      video.preview = await extractPreview(video, previewDir, force);
      onVideo?.(video);
    }
  });
  await Promise.all(workers);
}

export async function prunePreviews(videos, previewDir) {
  const valid = new Set(videos.map(v => `${v.id}.jpg`));
  try {
    const files = await fsp.readdir(previewDir);
    let count = 0;
    for (const f of files) {
      if (f.endsWith('.jpg') && !valid.has(f)) {
        await fsp.unlink(path.join(previewDir, f)).catch(() => {});
        count++;
      }
    }
    if (count > 0) console.error(`Pruned ${count} orphaned preview(s).`);
  } catch {}
}
