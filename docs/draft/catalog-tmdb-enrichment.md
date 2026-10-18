# Draft — TMDB Catalog Enrichment & Standard Classification

**Status:** Exploration only — no plan devised yet.
**Date:** 2026-10-18
**Scope:** Improve `npm run catalog` to enrich metadata from TMDB (canonical
`name`, classification, and other fields) and replace the hardcoded
folder-name categories with a standard taxonomy.

This document records findings from a read-only pass over the build pipeline,
the catalog artifact, and every consumer of `category`. It ends with open
questions that must be answered before a phase plan is written.

---

## 1. How the catalog works today

`npm run catalog` → `scripts/build-catalog.mjs`:

1. `server/catalog.ts` — recursive scan; sets
   `id / name / path / fullPath / size / mtimeMs / category`.
2. `enrichCaptions` (`scripts/enrich.mjs:10`) — reuses cached fields for
   same-size files, otherwise discovers subtitle tracks.
3. `addPreviews` — ffmpeg thumbnail extraction.
4. `enrichMetadata` (`scripts/enrich.mjs:52`) — ffprobe runtimes + TMDB lookups.
5. `writeCatalogIndex` → `catalog/index.json`.

**The runtime serves the baked catalog, not a live scan.** `server.ts:19-24`
reads `catalog/index.json` via `readCatalogVideos()`. `name`, `category`,
`year`, and `genres` are frozen at build time. The server has **no** outbound
network access.

`server/videos.ts` contains a second, now-dead copy of `classify()` and
`listVideos()` — nothing imports it (grep found only documentation
references). `classify()` is therefore duplicated in `server/catalog.ts` and
`server/videos.ts`.

---

## 2. Gaps found (with evidence)

### 2.1 Classification is exact folder-name matching and misses most of the library

`server/catalog.ts:9-18` returns `Movies / Music / Series / Other` only for
folders literally named `movies`, `music`, `series`, `tv`, `shows`,
`tv shows`.

Actual tree and result:

| Folder | Files | Classified as |
|---|---|---|
| `Videos/Series1` | 242 | **Other** (should be Series) |
| `Videos/Series` | 101 | Series |
| `Videos/Movies1` | 59 | **Other** (should be Movies) |
| `Videos/Movies` | 23 | Movies |
| `Videos/Screencasts`, `Animations`, `4K Video Downloader+`, `Tips` | 8 | Other |

Catalog counts today: `Movies 23, Series 101, Other 309, Music 0` of 433.

### 2.2 Series grouping inherits the bug

`server/series.ts:37-48` only groups `category === 'Series'`, and
`getSeriesInfo` (`server/series.ts:12-19`) only recognizes a show folder
directly under `series`/`tv`/`shows`. Only 3 shows are produced
(`Strike.Back`, `Special.Ops.Lioness`, `The.Ark`). The four shows inside
`Series1` (My Wife and Kids, Chuck, Knight Rider, Are We There Yet — ~242
files) are invisible as series.

### 2.3 TMDB enrichment produced nothing

`catalog/index.json` currently shows:

| Field | Present |
|---|---|
| `runtime` | 431 / 433 (ffprobe) |
| `year` | 79 / 433 (filename parsing only) |
| `genres` | 0 / 433 |
| `synopsis` | 0 / 433 |

### 2.4 Why TMDB never ran

The TMDB client reads `process.env.TMDB_API_KEY` only
(`scripts/tmdb.mjs:9-12`). There is no dotenv and no `--env-file`, so
`npm run catalog` runs TMDB-blind. The repo's `.env` **does** define
`TMDB_API_KEY` and `TMDB_API_READ_ACCESS_TOKEN`, but nothing loads it.

Even when it runs, the reuse guard at `enrich.mjs:68`
(`refreshMeta || video.genres === undefined`) means once `genres` exist, no
field is ever refreshed without `--refresh-meta`. And the carry-forward list
in `enrichCaptions` (`enrich.mjs:18`) only preserves
`{captions, preview, year, genres, runtime, synopsis}` — any new field must be
added there or it is lost on the next build.

### 2.5 TMDB returns too little, and matching is weak

`fieldsOf()` (`scripts/tmdb.mjs:19-26`) emits only
`{year, genres, runtime, synopsis}` — no canonical title, no media type, no
TMDB id / rating / language. `pick()` (`tmdb.mjs:43-48`) is "exact normalized
title match, else `results[0]`", which is where `Strike.Back` /
`Special.Ops.Lioness` false positives originate.

### 2.6 `name` is never canonicalized

Cards display raw release names, e.g.
`A.Working.Man.2025.720p.BluRay.x264.AAC-[YTS.MX].mp4`.

### 2.7 The category model is hardcoded at every consumer

- `types.ts:10` — `Category = 'Movies' | 'Music' | 'Series' | 'Other'`
- `server/api.ts:9-14` — hardcoded `counts`
- `server/catalog.ts:113,144` — hardcoded `byCategory`
- `public/index.html:70-74` — literal chips
- `public/js/state.js:7` — `CATEGORIES`
- `public/js/{cards,series,hero,watch,watchinfo,util}.js` — string comparisons
  against `'Series'` / `'Other'`

Changing the model is therefore a **response-shape change**, which AGENTS.md
lists under "Stop and Ask Before".

---

## 3. The design question: media type vs. genre

The current union conflates:

- **structural type** — movie vs. episodic series (drives layout/grouping);
- **content kind** — music;
- **junk drawer** — `Other`.

A standard streaming taxonomy separates the axes:

- **media type** (structural): `movie` | `series` | `music` | `other`
- **genre(s)** (descriptive): canonical TMDB genres, feeding the existing
  (currently empty) genre dropdown.

### Option A — Two-axis model (recommended baseline)

Add `mediaType` + keep `genres[]`, add canonical `title` (keep `name` as the
filename), plus optional `contentRating`, `originalLanguage`, `tmdbId`.
Chips become "All + distinct media types"; the genre dropdown fills from real
genres. Fixes grouping, filters, and display in one move.

### Option B — Robust heuristics only

Normalize folder/file names (`Series1` → series, `SxxExx` detection,
synonyms, strip trailing digits); no TMDB dependency for typing; keep 4
categories. Small and offline-safe, but still conflates the axes and leaves
names ugly.

### Option C — Full TMDB taxonomy

Genre IDs, keywords, collections, artwork, cast. Much larger; adds assets,
routes, and many new response fields.

---

## 4. Matching & naming considerations

- Prefer **scored matching** (normalized title + year proximity + popularity)
  over the current top-hit, plus a persistent `--unmatched` report and an
  override file (e.g. `catalog/overrides.json`) for manual corrections.
- "Update `name`" needs a policy: **display title only** (add `title`, keep
  `name` = filename) vs. actually renaming files on disk. Renaming media on
  disk is a much larger, riskier action.
- TV detection should use structure (`Series*`, `Season N`, `S01E01`) and
  confirm via TMDB `/tv`, not "folder named exactly series".

---

## 5. Constraints that will shape any design

- **AGENTS.md "Stop and Ask Before": changing the API response shape** —
  removing `category` / adding `mediaType`/`title` needs explicit sign-off.
- **Runtime deps: none.** TMDB and ffprobe are build-time only; the server
  never calls out; the key is never committed or logged.
- **No dotenv.** The clean dependency-free way to read `.env` is Node's
  built-in `node --env-file=.env scripts/build-catalog.mjs` (Node ≥ 20.6) in
  the `catalog` npm script.
- **80-line module cap** (`server.ts` ≤ 50) — scoring/override logic likely
  needs its own script module(s).
- `catalog/index.json` is gitignored, so a rebuild / backfill
  (`--refresh-meta`) is expected after any schema change.
- Affected files if the model changes: `types.ts`, `server/catalog.ts`,
  `server/api.ts`, `server/series.ts`, `scripts/{build-catalog,tmdb,enrich}.mjs`,
  `public/index.html`,
  `public/js/{state,filters,cards,series,hero,watch,watchinfo,util}.js`,
  README / AGENTS.

---

## 6. Open questions (answer before planning)

1. **Model:** Option A (mediaType + genres + canonical title), B (robust
   heuristics, keep 4 categories), or C (full TMDB taxonomy)?
2. **`name` policy:** replace `name` with the TMDB title for display, or add a
   separate `title` field and keep `name` as the raw filename? Any intent to
   rename files on disk?
3. **Unmatched / offline behavior:** fall back to heuristic typing + filename
   (recommended), or exclude unmatched titles from the catalog?
4. **Extra fields:** which of `title, originalTitle, mediaType, genres, year,
   runtime, synopsis, contentRating, originalLanguage, tmdbId, tmdbUrl` are
   wanted? (Artwork/backdrops = separate, larger phase.)
5. **`.env` loading:** switch the `catalog` script to `node --env-file=.env`
   (built-in), or always export `TMDB_API_KEY` manually?
6. **Scope boundary:** new roadmap phase under `docs/roadmaps/` (including the
   UI chip changes), or build/backend only with the UI adapted afterwards?

---

## 7. Decisions (answered 2026-10-18)

1. **Model:** **Option A** — separate structural `mediaType`
   (`movie | series | music | other`) from descriptive `genres[]`.
2. **`name` policy:** add a new `title` field; fill it from the TMDB title
   when matched. When TMDB has no title, derive `title` from `name` by
   cleaning dots/dashes/file-extension. Keep `name` as the raw filename; no
   on-disk renaming.
3. **Unmatched / offline:** never exclude — fall back to heuristic typing plus
   the cleaned title derived from `name`. (Deriving `title` from `name` is the
   default whenever a TMDB title is unavailable.)
4. **Fields:** `title`, `mediaType`, `genres`, `year`, `runtime`, `synopsis`
   (from TMDB; `runtime`/`year` keep ffprobe/filename fallbacks).
5. **`.env` loading:** see §8 — clarification requested.
6. **Scope:** **back-to-front** — build pipeline first, then the backend
   contract (`types.ts`, `server/catalog.ts`, `server/api.ts`,
   `server/series.ts`), then the frontend (`index.html` chips,
   `public/js/state.js` `CATEGORIES`, and the `category` string comparisons in
   `cards.js`, `series.js`, `hero.js`, `watch.js`, `watchinfo.js`, `util.js`).

---

## 8. TMDB key loading — clarification

### The problem

`npm run catalog` runs `node scripts/build-catalog.mjs`, and that process only
sees variables exported into the shell. The repo's `.env` holds
`TMDB_API_KEY` and `TMDB_API_READ_ACCESS_TOKEN`, but **nothing reads the
file** — which is exactly why the current catalog has `genres 0/433` and
`synopsis 0/433`.

`dotenv` is banned (AGENTS.md: no utility libraries), but Node itself can read
an env file — no dependency, no code.

### Verified on this machine (Node v22.23.3)

```
node -e "Boolean(process.env.TMDB_API_KEY)"                       -> false
node --env-file-if-exists=.env -e "Boolean(...TMDB_API_KEY)"      -> true
TMDB_API_KEY=shell node --env-file-if-exists=.env -e "..."        -> shell value wins
```

So the flag loads the file, and a shell-exported value still overrides it
(handy for one-off builds). Values are never printed.

### Options

| # | `package.json` `catalog` script | Behavior | Trade-off |
|---|---|---|---|
| A | `node --env-file=.env scripts/build-catalog.mjs` | loads `.env`; **hard-fails if `.env` is missing** | simple, but breaks fresh clones / CI |
| B | `node --env-file-if-exists=.env scripts/build-catalog.mjs` | loads if present, silently continues otherwise | keyless/offline builds still work; needs Node ≥ 22.9 (you have 22.23) |
| C | leave as-is; document `TMDB_API_KEY=… npm run catalog` | explicit, nothing changes | easy to forget — the exact state that produced 0 genres |
| D | add `catalog:tmdb` alongside the plain `catalog` script | opt-in TMDB build | two entry points to maintain |

### Recommendation

**Option B** (`--env-file-if-exists`), because it makes the common case
(`npm run catalog` with a local `.env`) just work while keeping the
keyless/offline path intact.

### Notes

- `.env` stays gitignored; nothing is committed; `--env-file` never logs
  values. The flag is added **only** to the build script — `server.ts` is
  never given it, so the runtime still has zero TMDB access.
- `.env` carries both a v3 key and a v4 read-access token. The current client
  uses the v3 `api_key` query param; keep that unless you'd rather switch to
  the v4 bearer header.
- A contributor without a key still gets a full catalog (heuristic typing +
  cleaned titles); TMDB simply refines it.

---

## 9. Next step

Confirm the `.env` option (§8) and then a phase plan can be drafted under
`docs/roadmaps/`, ordered back-to-front per §7.6.
