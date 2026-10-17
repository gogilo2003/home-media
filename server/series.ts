import type { Category, Video } from '../types.ts';

export interface SeriesGroup {
  show: string;
  seasons: string[];
}

export function isSeries(v: Video | { path: string; category?: Category }): boolean {
  return (v.category || 'Other') === 'Series';
}

export function getSeriesInfo(filePath: string): { show: string; season?: string } | null {
  const parts = filePath.split(/[/\\]/);
  const idx = parts.findIndex((p) => ['series', 'tv', 'shows', 'tv shows'].includes(p.toLowerCase()));
  if (idx === -1 || idx + 1 >= parts.length - 1) return null;
  const show = parts[idx + 1]!;
  const season = idx + 2 < parts.length - 1 ? parts[idx + 2]! : 'Season 1';
  return { show, season };
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
  for (const v of videos) {
    if (!isSeries(v)) continue;
    const info = getSeriesInfo(v.path);
    if (!info?.show) continue;
    const { show, season = 'Season 1' } = info;
    if (!byShow.has(show)) byShow.set(show, new Map());
    const smap = byShow.get(show)!;
    if (!smap.has(season)) smap.set(season, []);
    smap.get(season)!.push(v);
  }
  const series = [];
  for (const [show, smap] of byShow.entries()) {
    const seasons = [];
    let showPath = '';
    for (const [season, eps] of smap.entries()) {
      eps.sort((a, b) => a.path.localeCompare(b.path));
      if (!showPath && eps[0]) showPath = eps[0].path.slice(0, eps[0].path.indexOf(show) + show.length);
      seasons.push({
        name: season,
        preview: eps[0]?.preview,
        episodes: eps.map((e) => ({
          name: e.name, path: e.path, fullPath: e.fullPath, size: e.size, captions: e.captions, preview: e.preview,
        })),
      });
    }
    seasons.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    series.push({ title: show, showPath, preview: seasons[0]?.preview, seasons });
  }
  return series;
}
