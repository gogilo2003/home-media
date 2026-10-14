import type { Category, Video } from '../types.ts';

export interface SeriesGroup {
  show: string;
  seasons: string[];
}

export function isSeries(v: Video | { path: string; category?: Category }): boolean {
  return (v.category || 'Other') === 'Series';
}

export function getSeriesInfo(path: string): { show: string; season?: string } | null {
  const parts = path.split('/');
  if (parts.length < 4) return null;
  // expect Videos/Series/<show>/<season>/...
  if (parts[2] === undefined || parts[3] === undefined) return null;
  return { show: parts[2], season: parts[3] };
}

export function groupSeries(videos: Video[]): Record<string, SeriesGroup> {
  const groups: Record<string, SeriesGroup> = {};
  for (const v of videos) {
    if (!isSeries(v)) continue;
    const info = getSeriesInfo(v.path);
    if (!info || !info.show || !info.season) continue;
    if (!groups[info.show]) {
      groups[info.show] = { show: info.show, seasons: [] };
    }
    const g = groups[info.show];
    if (g && !g.seasons.includes(info.season)) {
      g.seasons.push(info.season);
    }
  }
  for (const k of Object.keys(groups)) {
    const g = groups[k];
    if (g) g.seasons.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return groups;
}
