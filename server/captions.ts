import fsp from 'node:fs/promises';
import path from 'node:path';

export interface CaptionTrack {
  label: string;
  lang?: string;
  url: string;
  format: 'srt' | 'vtt';
}

function matchesSubtitle(videoBase: string, subName: string): boolean {
  const ext = path.extname(subName);
  const subBase = path.basename(subName, ext).toLowerCase();
  if (subBase === videoBase) return true;
  if (subBase.startsWith(videoBase + '.') || subBase.startsWith(videoBase + '_') || subBase.startsWith(videoBase + '-')) {
    return true;
  }
  return ['sub', 'subs', 'subtitle', 'subtitles', 'english', 'eng', 'turkish', 'tur'].includes(subBase);
}

export async function findCaptionsForVideo(videoFullPath: string, videoRelPath: string): Promise<CaptionTrack[]> {
  const dir = path.dirname(videoFullPath);
  const videoBase = path.basename(videoFullPath, path.extname(videoFullPath)).toLowerCase();
  const tracks: CaptionTrack[] = [];
  const candidates = [dir, path.join(dir, 'Subs'), path.join(dir, 'subs'), path.join(dir, 'Subtitles'), path.join(dir, 'subtitles')];
  for (const d of candidates) {
    try {
      const entries = await fsp.readdir(d);
      for (const e of entries) {
        const ext = path.extname(e).toLowerCase();
        if (ext !== '.srt' && ext !== '.vtt') continue;
        if (!matchesSubtitle(videoBase, e)) continue;
        const track: CaptionTrack = {
          label: e,
          url: `/captions/${encodeURIComponent(videoRelPath)}/${encodeURIComponent(e)}`,
          format: ext === '.vtt' ? 'vtt' : 'srt',
        };
        const name = e.toLowerCase();
        if (name.includes('eng') || name.includes('english')) track.lang = 'en';
        else if (name.includes('tur') || name.includes('turkish')) track.lang = 'tr';
        else if (name === 'subtitle.srt' || name.startsWith('sub.')) track.lang = 'en';
        tracks.push(track);
      }
    } catch {
      continue;
    }
  }
  return tracks;
}
