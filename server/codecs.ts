import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';

const checks = new Map<string, { stamp: string; safe: boolean }>();
const browserContainers = new Set(['.mp4', '.m4v', '.mov']);

function probe(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_type,codec_name',
      '-of', 'json', filePath,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(null); }, 15000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (part: string) => { output += part; });
    child.once('error', () => finish(null));
    child.once('close', (code) => finish(code === 0 ? output : null));
  });
}

export async function isBrowserSafe(filePath: string, ext: string): Promise<boolean> {
  if (!browserContainers.has(ext)) return false;
  const stat = await fsp.stat(filePath);
  const stamp = `${stat.size}:${stat.mtimeMs}`;
  const cached = checks.get(filePath);
  if (cached?.stamp === stamp) return cached.safe;
  let safe = false;
  try {
    const raw = await probe(filePath);
    const streams = raw ? JSON.parse(raw).streams as Array<{ codec_type: string; codec_name: string }> : [];
    const video = streams.filter((stream) => stream.codec_type === 'video');
    const audio = streams.filter((stream) => stream.codec_type === 'audio');
    safe = video.length > 0 && audio.length > 0
      && video.every((stream) => stream.codec_name === 'h264')
      && audio.every((stream) => stream.codec_name === 'aac');
  } catch {
    safe = false;
  }
  checks.set(filePath, { stamp, safe });
  return safe;
}
