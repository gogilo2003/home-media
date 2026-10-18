// Build-time TMDB v3 client: env-only key, ~10 req/s throttle, in-run hit/miss cache.
const BASE = 'https://api.themoviedb.org/3';
const GAP_MS = 100;
const hits = new Map(); const misses = new Set();
let lastCall = 0;

export function hasTmdbKey() { return Boolean(process.env.TMDB_API_KEY?.trim()); }

function yearOf(date) {
  const m = /^(\d{4})-/.exec(String(date ?? ''));
  return m ? Number(m[1]) : undefined;
}

function fieldsOf(detail, kind) {
  const tv = kind === 'tv';
  return {
    title: (tv ? detail.name : detail.title) || undefined,
    mediaType: tv ? 'series' : 'movie',
    year: yearOf(detail.release_date ?? detail.first_air_date),
    genres: (detail.genres ?? []).map((g) => g.name).filter(Boolean),
    runtime: tv ? undefined : (detail.runtime || undefined),
    synopsis: detail.overview || undefined,
  };
}

async function api(path, params) {
  const wait = GAP_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = new URL(BASE + path);
  url.searchParams.set('api_key', process.env.TMDB_API_KEY.trim());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// Score candidates: exact normalized title beats prefix/containment, tie-broken
// by popularity and a ±1 year window; falls back to TMDB's top hit on no overlap.
function pick(results, name, year) {
  const list = Array.isArray(results) ? results : [];
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const target = norm(name);
  if (!target) return list[0];
  const rank = (r) => {
    const t = norm(r.title ?? r.name);
    let s = t === target ? 100 : t.startsWith(target) || target.startsWith(t) ? 60 : t.includes(target) || target.includes(t) ? 30 : -1;
    if (s >= 0 && year) { const y = yearOf(r.release_date ?? r.first_air_date); if (y && Math.abs(y - year) <= 1) s += 20; }
    return s < 0 ? s : s + Math.min(20, Math.log10((r.popularity || 0) + 1) * 10);
  };
  return list.map((r) => [rank(r), r]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])[0]?.[1] ?? list[0];
}

async function lookup(query) {
  const isTv = query.kind === 'tv';
  const found = await api(isTv ? '/search/tv' : '/search/movie',
    {query: query.name, year: isTv ? undefined : query.year});
  const hit = pick(found.results, query.name, query.year);
  if (!hit || !hit.id) return null;
  return fieldsOf(await api((isTv ? '/tv/' : '/movie/') + hit.id, {}), query.kind);
}

/**
 * Resolve one `{kind, name, year}` query to `{title, mediaType, genres, year,
 * runtime, synopsis}`. Returns null for a known miss or an API failure, and
 * never re-asks either.
 */
export async function resolveQuery(query) {
  const key = `${query.kind}:${query.name.toLowerCase()}`;
  if (hits.has(key)) return hits.get(key);
  if (misses.has(key)) return null;
  let fields = null;
  try { fields = await lookup(query); } catch { fields = null; }
  if (fields) hits.set(key, fields); else misses.add(key);
  return fields;
}

export function tmdbMisses() { return [...misses].map((key) => key.slice(key.indexOf(':') + 1)); }
