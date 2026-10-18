import type { Category, MediaType, Video } from '../types.ts';
import { seriesParts } from './classify.ts';

export interface SeriesGroup {
  show: string;
  seasons: string[];
}

export function isSeries(v: { category?: Category; mediaType?: MediaType }): boolean {
  return v.mediaType ? v.mediaType === 'series' : (v.category || 'Other') === 'Series';
}

export function getSeriesInfo(filePath: string): { show: string; season: string; showPath: string } | null {
  const info = seriesParts(filePath);
  return info ? { show: info.show, season: info.season ?? 'Season 1', showPath: info.showPath } : null;
}

export function groupSeries(videos: Video[]): Record<string, SeriesGroup> {
  const groups: Record<string, SeriesGroup> = {};
  for (const v of videos) {
    if (!isSeries(v)) continue;
    const info = getSeriesInfo(v.path);
    if (!info?.show || !info.season) continue;
    if (!groups[info.show]) groups[info.show] = { show: info.show, seasons: [] };
    const g = groups[info.show]!;
    if (!g.seasons.includes(info.season)) g.seasons.push(info.season);
  }
  for (const k of Object.keys(groups)) {
    groups[k]?.seasons.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return groups;
}

export function buildSeriesCatalog(videos: any[]): any[] {
  const byShow = new Map<string, Map<string, any[]>>();
  const showPaths = new Map<string, string>();
  for (const v of videos) {
    if (!isSeries(v)) continue;
    const info = getSeriesInfo(v.path);
    if (!info?.show) continue;
    const { show, season = 'Season 1' } = info;
    if (!showPaths.has(show)) showPaths.set(show, info.showPath);
    if (!byShow.has(show)) byShow.set(show, new Map());
    const smap = byShow.get(show)!;
    if (!smap.has(season)) smap.set(season, []);
    smap.get(season)!.push(v);
  }
  const series = [];
  for (const [show, smap] of byShow.entries()) {
    const seasons = [];
    for (const [season, eps] of smap.entries()) {
      eps.sort((a, b) => a.path.localeCompare(b.path));
      seasons.push({
        name: season,
        preview: eps[0]?.preview,
        episodes: eps.map((e) => ({
          name: e.name, path: e.path, fullPath: e.fullPath, size: e.size, captions: e.captions, preview: e.preview,
        })),
      });
    }
    seasons.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    series.push({ title: show, showPath: showPaths.get(show) ?? '', preview: seasons[0]?.preview, seasons });
  }
  return series;
}
