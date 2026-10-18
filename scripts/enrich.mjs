import {createProgress} from './progress.mjs';
import {findCaptionsForVideo} from '../server/captions.ts';
import {classifyMedia, cleanTitle, showName} from '../server/classify.ts';
import {parseTitleYear} from '../server/metadata.ts';
import {addRuntimes, hasFfprobe} from './ffprobe.mjs';
import {hasTmdbKey, resolveQuery, tmdbMisses} from './tmdb.mjs';

// A same-size file is unchanged, so carry every field forward and let the
// enrichment pass fill any gaps; only a resized file is treated as new.
export async function enrichCaptions(videos, existing) {
  const bar = createProgress(videos.length, 'captions');
  const enriched = [];
  let reused = 0;
  for (const video of videos) {
    const prev = existing.get(video.id);
    const sameFile = Boolean(prev && prev.size === video.size);
    if (sameFile) {
      const {captions, preview, year, genres, runtime, synopsis, title, mediaType} = prev;
      enriched.push({...video, captions, preview, year, genres, runtime, synopsis, title, mediaType});
      reused++;
    } else {
      try {
        const caps = await findCaptionsForVideo(video.fullPath, video.path);
        enriched.push({...video, captions: caps.length ? caps : undefined, preview: prev?.preview});
      } catch { enriched.push({...video, preview: prev?.preview}); }
    }
    bar.render(video.name);
  }
  bar.end(reused > 0 ? `Captions done (${reused} cached)` : 'Captions done');
  return enriched;
}

// What a single video can ask TMDB about: the show folder for a series,
// otherwise the movie title parsed out of the path.
function queryFor(video) {
  const mediaType = classifyMedia(video.path, video.name);
  if (mediaType === 'series') {
    const show = showName(video.path);
    return show ? {kind: 'tv', name: show} : null;
  }
  if (mediaType !== 'movie') return null;
  const {title, year} = parseTitleYear(video.path);
  return {kind: 'movie', name: cleanTitle(video.name) || title, year};
}

function applyMeta(video, fields) {
  for (const k of ['title', 'mediaType', 'genres', 'synopsis']) if (fields[k] !== undefined) video[k] = fields[k];
  if (video.year === undefined && fields.year !== undefined) video.year = fields.year;
  if (video.runtime === undefined && fields.runtime !== undefined) video.runtime = fields.runtime;
}

export async function enrichMetadata(videos, {refreshMeta = false, useTmdb = true} = {}) {
  if (await hasFfprobe()) {
    const bar = createProgress(videos.length, 'runtime');
    await addRuntimes(videos, {force: refreshMeta, onVideo: (video) => bar.render(video.name)});
    bar.end('Runtime done');
  } else {
    console.warn('Warning: ffprobe not found in PATH; skipping runtime extraction.');
  }
  const useApi = useTmdb && hasTmdbKey();
  if (useTmdb && !useApi) console.warn('Warning: TMDB_API_KEY not set; skipping TMDB metadata.');
  const bar = createProgress(videos.length, 'metadata');
  let queried = 0;
  for (const video of videos) {
    const query = queryFor(video);
    if (video.year === undefined) video.year = query?.year;
    video.title = video.title ?? cleanTitle(video.name);
    video.mediaType = video.mediaType ?? classifyMedia(video.path, video.name);
    if (useApi && query && (refreshMeta || video.genres === undefined)) {
      const fields = await resolveQuery(query);
      if (fields) applyMeta(video, fields);
      queried++;
    }
    bar.render(video.name);
  }
  bar.end(useApi ? `TMDB done (${queried} queried)` : 'Metadata done');
  const missed = tmdbMisses(); if (missed.length) console.warn(`Unmatched by TMDB (${missed.length}): ${missed.join(', ')}`);
}
