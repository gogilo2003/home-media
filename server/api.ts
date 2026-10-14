import type { Video } from '../types.ts';
import { groupSeries } from './series.ts';

export async function enhanceVideos(videos: Video[]): Promise<Video[]> {
  const { findCaptionsForVideo } = await import('./captions.ts');
  const out: Video[] = [];
  for (const v of videos) {
    try {
      const path = await import('node:path');
      const { VIDEO_ROOT } = await import('./config.ts');
      const full = (v as any).fullPath || path.resolve(VIDEO_ROOT, v.path);
      const captions = await findCaptionsForVideo(full, v.path);
      out.push({ ...v, captions: captions.length ? captions : undefined } as any);
    } catch {
      out.push(v as any);
    }
  }
  return out;
}

export function toApiResponse(videos: Video[]) {
  const seriesGroups = groupSeries(videos);
  return {
    videos,
    seriesGroups,
    counts: {
      Movies: videos.filter((v) => v.category === 'Movies').length,
      Music: videos.filter((v) => v.category === 'Music').length,
      Series: videos.filter((v) => v.category === 'Series').length,
      Other: videos.filter((v) => v.category === 'Other').length,
      total: videos.length,
    },
  };
}
