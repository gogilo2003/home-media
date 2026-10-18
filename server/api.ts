import type { MediaType, Video } from '../types.ts';
import { groupSeries } from './series.ts';

const MEDIA_TYPES: MediaType[] = ['movie', 'series', 'music', 'other'];

export function toApiResponse(videos: Video[]) {
  const seriesGroups = groupSeries(videos);
  const counts: Record<string, number> = { total: videos.length };
  for (const t of MEDIA_TYPES) counts[t] = videos.filter((v) => v.mediaType === t).length;
  return { videos, seriesGroups, counts };
}
