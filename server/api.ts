import type { Video } from '../types.ts';
import { groupSeries } from './series.ts';

export function enhanceVideos(videos: Video[]): Video[] {
  return videos.map((v) => ({ ...v }));
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
