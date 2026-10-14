
export interface Episode {
  name: string;
  path: string;
  fullPath: string;
  size: number;
}

export interface Season {
  name: string;
  episodes: Episode[];
}

export interface Series {
  title: string;
  showPath: string;
  seasons: Season[];
}

export interface CatalogMeta {
  version: string;
  updated: string;
  videos: any[];
  series: Series[];
  counts: {
    Movies: number;
    Music: number;
    Series: number;
    Other: number;
    total: number;
  };
}
