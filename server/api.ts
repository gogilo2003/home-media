import type { Category, MediaType, Video } from '../types.ts';
import { groupSeries } from './series.ts';

const MEDIA_TYPES: MediaType[] = ['movie', 'series', 'music', 'other'];
const CATEGORIES: Category[] = ['Movies', 'Music', 'Series', 'Other'];

export function toApiResponse(videos: Video[]) {
  const seriesGroups = groupSeries(videos);
  const counts: Record<string, number> = { total: videos.length };
  for (const t of MEDIA_TYPES) counts[t] = videos.filter((v) => v.mediaType === t).length;
  for (const c of CATEGORIES) counts[c] = videos.filter((v) => (v.category ?? 'Other') === c).length;
  return { videos, seriesGroups, counts };
}
