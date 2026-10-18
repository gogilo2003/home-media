# Home Media

A tiny, dependency-free video streaming server for your local network. It scans
a folder of video files, builds a catalog with preview thumbnails and subtitle
tracks, and serves a dark single-page web UI that lists, browses, and plays your
library. Seeking works out of the box because the server speaks HTTP Range.

No framework, no database, no auth, no build step for the backend — just Node's
built-in `http`, `fs`, and `path` modules, plus a Tailwind build for the CSS.

## Features

- **Recursive library scan** of `VIDEO_ROOT`, following directory symlinks.
- **Automatic media typing** into `movie` / `series` / `music` / `other` from
  folder names (`Movies`, `Series`, `TV`, `Shows`, `Music`) and episodic markers
  (`S01E02`, `Season 1`); descriptive `genres` are a separate axis.
- **TMDB enrichment** (optional, build-time): canonical `title`, `genres`,
  `year`, `runtime`, and `synopsis` when `TMDB_API_KEY` is set.
- **Series grouping** — episodes are grouped by show and season, with a season
  picker and an in-page player.
- **Preview thumbnails** extracted with `ffmpeg` at catalog build time.
- **Subtitles** (`.srt` / `.vtt`) discovered next to each video and served for
  the browser player.
- **HTTP Range streaming** (`206` / `416`) so the native `<video>` element can
  seek without any player library.
- **Search and media-type filters** in the UI.
- **LAN-first** — binds to `0.0.0.0` and prints the addresses your phone can use.

## Requirements

- **Node.js 22.18+** (or 23.6+) — TypeScript is run directly via Node's
  built-in type stripping. There is no compile step and no bundler.
- **ffmpeg** *(optional)* — required only to generate preview thumbnails. The
  catalog still builds without it; cards just fall back to a gradient.

## Quick start

```bash
npm install                # dev deps only (tailwindcss, typescript, @types/node)
npm run catalog            # scan videos/ and write catalog/index.json + previews
npm run css:build          # generate public/styles.css
npm start                  # serve on http://0.0.0.0:3000
```

Then open `http://localhost:3000`, or the LAN address printed at startup, from
any device on the same network.

> `catalog/index.json` and `public/styles.css` are generated files and are
> gitignored — run `npm run catalog` and `npm run css:build` after a fresh clone.

## Adding media

Drop supported files anywhere under `videos/` (mirror folders so media is typed,
e.g. `videos/Movies/`, `videos/Series/Breaking Bad/S01/`). Then rebuild the
catalog:

```bash
npm run catalog
```

The catalog build is incremental: files whose size is unchanged reuse their
cached captions, preview, and metadata, so re-runs are fast.

### Metadata enrichment (TMDB)

Set a TMDB API key in `.env` (gitignored) and `npm run catalog` fills each
entry's canonical `title`, `genres`, `year`, `runtime`, and `synopsis`:

```bash
# .env
TMDB_API_KEY=your_v3_key
```

The `catalog` script auto-loads `.env` via `node --env-file-if-exists=.env`; an
exported `TMDB_API_KEY` still wins, and a missing `.env` simply skips
enrichment. TMDB is used **only at build time** — the server never reads the key
and never calls out. Unmatched titles keep the heuristic typing plus a cleaned
`title` derived from the filename.

### Catalog options

```bash
npm run catalog -- [options] [path]
```

| Option               | Effect                                                       |
|----------------------|--------------------------------------------------------------|
| `--skip-previews`    | Do not extract preview thumbnails.                           |
| `--refresh-previews` | Force re-extraction of every thumbnail.                      |
| `--previews-only`    | Refresh thumbnails without rewriting `catalog/index.json`.   |
| `--prune`            | Delete orphaned preview images from `catalog/previews/`.     |
| `--no-tmdb`          | Skip TMDB lookups (heuristic typing + cleaned titles only).  |
| `--refresh-meta`     | Re-probe runtimes and re-query TMDB for every title.         |
| `--help`, `-h`       | Show help.                                                    |
| `[path]`             | Scan this directory instead of `VIDEO_ROOT` (`./videos`).    |

## Supported formats

| Extension | Content-Type        |
|-----------|---------------------|
| `.mp4`    | `video/mp4`         |
| `.webm`   | `video/webm`        |
| `.mkv`    | `video/x-matroska`  |
| `.mov`    | `video/quicktime`   |
| `.m4v`    | `video/x-m4v`       |

Subtitles: `.srt` and `.vtt`, discovered in the video's folder and in `Subs/`,
`subs/`, `Subtitles/`, or `subtitles/` subfolders.

> Note: browsers play MP4/WebM natively. MKV and some MOV/M4V codecs may not
> play in the browser even though the server streams them correctly.

## Configuration

| Variable       | Default                 | Description                                                          |
|----------------|-------------------------|----------------------------------------------------------------------|
| `PORT`         | `3000`                  | Listen port (HTTP and HTTPS).                                        |
| `VIDEO_ROOT`   | `./videos`              | Media directory to scan.                                             |
| `TLS_KEY`      | `certs/server-key.pem`  | TLS private key; set together with `TLS_CERT` to serve HTTPS.       |
| `TLS_CERT`     | `certs/server-cert.pem` | TLS certificate with an IP SAN.                                      |
| `TMDB_API_KEY` | *(unset)*               | Build-time TMDB v3 key; enables metadata enrichment.                |

`VIDEO_ROOT` is read by the catalog builder and by the server's path guard.
`TMDB_API_KEY` (or `TMDB_API_READ_ACCESS_TOKEN`) is read only by the catalog
builder, typically from `.env`.

## HTTPS on the LAN

Mobile browsers now default to **HTTPS-First**: they silently upgrade `http://`
to `https://`, and against a plain-HTTP server that fails with
`ERR_SSL_PROTOCOL_ERROR`. Serve real TLS on the same port (3000) to satisfy the
upgrade:

```bash
node scripts/gen-certs.mjs 192.168.100.7   # your server's LAN IP(s)
TLS_KEY=certs/server-key.pem TLS_CERT=certs/server-cert.pem npm start
```

The script mints a local CA and an IP-SAN server certificate under `certs/`
(gitignored; private keys are mode `600`). Install `certs/ca-cert.pem` once on
each device — Android: **Settings → Security & location → Encryption &
credentials → Install from storage → CA certificate** (a screen lock is
required). Chrome then accepts the certificate and the upgrade succeeds with no
warning.

- TLS also turns on with no env vars when both default files exist, so the
  export line is optional if you keep the default paths.
- The certificate is identity-bound to the IP. If the router later hands out a
  different address, re-run the script (or set a DHCP reservation).
- The SAN must match the **exact host the browser dials** — an IP, not a name.
  `127.0.0.1` will not validate unless it is in the SAN list.
- No HSTS and no redirect: the browser performs the upgrade itself.
  `node:https` is built in, so there are still no runtime dependencies.

## Docker

```bash
npm run catalog            # build the catalog on the host first
docker compose up --build
```

The compose service mounts `videos/` and `catalog/` read-only, so regenerate the
catalog on the host whenever your media changes:

```bash
npm run catalog
```

## Routes

| Method | Path                              | Purpose                                                        |
|--------|-----------------------------------|----------------------------------------------------------------|
| GET    | `/`                               | The web UI.                                                    |
| GET    | `/app.js`, `/styles.css`          | Static assets.                                                 |
| GET    | `/api/videos`                     | Catalog JSON: `{ videos, seriesGroups, counts }`.             |
| GET    | `/video/:id`                      | Stream a video with Range support (`206`/`416`).              |
| GET    | `/catalog/previews/:id.jpg`       | Preview thumbnail for a video.                                 |
| GET    | `/captions/:id/:name`             | Subtitle track (`.srt` / `.vtt`) for a video.                  |

`id` is the base64url encoding of a video's path relative to `VIDEO_ROOT`. Every
client-supplied path is validated against `VIDEO_ROOT` before touching the
filesystem.

## Project layout

```
home-media/
├── server.ts              # entry point: create server (http/https), listen, banner
├── server/                # backend modules, one concern per file
│   ├── config.ts          # PORT, VIDEO_ROOT, PUBLIC_DIR, static routes
│   ├── router.ts          # request handler (route dispatch)
│   ├── tls.ts             # opt-in TLS options from env / certs/
│   ├── http.ts            # response helper + static file serving
│   ├── ids.ts             # encodeId / decodeId / safeResolve
│   ├── mime.ts            # extension sets + MIME lookup
│   ├── net.ts             # LAN address discovery for the banner
│   ├── range.ts           # HTTP Range parsing
│   ├── file-stream.ts     # Range-aware file streaming
│   ├── stream.ts          # /video/:id
│   ├── preview.ts         # /catalog/previews/:id.jpg
│   ├── catalog.ts         # recursive scan + media typing
│   ├── classify.ts        # media typing, title cleaning, series paths
│   ├── catalog-index.ts   # read/write catalog/index.json
│   ├── captions.ts        # subtitle discovery
│   ├── captions-api.ts    # /captions/:id/:name
│   ├── series.ts          # series grouping
│   └── api.ts             # /api/videos response shape
├── types.ts               # shared Video / ByteRange contract (erased at runtime)
├── scripts/
│   ├── build-catalog.mjs  # catalog CLI
│   ├── gen-certs.mjs      # local CA + IP-SAN TLS certificate
│   ├── tmdb.mjs           # TMDB client (search + field mapping)
│   ├── enrich.mjs         # metadata + caption carry-forward
│   ├── catalog-previews.mjs # ffmpeg thumbnail extraction
│   └── progress.mjs       # TTY-aware progress reporter
├── certs/                 # generated TLS material (never committed)
├── public/                # static frontend (index.html, app.js)
├── src/input.css          # Tailwind source (styles.css is generated)
├── videos/                # media (never committed)
└── catalog/               # generated index.json + previews
```

## Commands

| Purpose       | Command                                           |
|---------------|---------------------------------------------------|
| Run server    | `npm start`                                       |
| Build catalog | `npm run catalog`                                 |
| Typecheck     | `npm run typecheck`                               |
| Watch CSS     | `npm run css`                                     |
| Build CSS     | `npm run css:build`                               |

## Design constraints

- **Runtime dependencies: none.** Dev-only: `tailwindcss`, `typescript`,
  `@types/node`.
- No HTTP framework, no database, no auth, no player library — the browser's
  native `<video>` handles playback and seeking.
- Range requests always return `206` with a correct `Content-Range`, or `416`.
  Never `200`.
- Every module stays under 80 lines; `server.ts` is a thin entry point.
- Erasable-syntax TypeScript only (no `enum`, `namespace`, decorators).
- `public/app.js` stays JavaScript (browsers can't strip types) and is
  type-checked via `// @ts-check` + JSDoc referencing `types.ts`.

## Documentation

- `docs/video-streaming-design.md` — architecture and implementation details.
- `docs/roadmaps/v0.1.0-minimal.md` — phase-by-phase build plan.
- `docs/roadmaps/v0.2.0-ui.md` — UI redesign plan (Browse + Watch, queue, player).
- `docs/roadmaps/catalog-tmdb-enrichment.md` — mediaType model + TMDB catalog.
- `docs/roadmaps/https-lan.md` — opt-in HTTPS on port 3000.
- `docs/ui-design/` — design mockups.
- `AGENTS.md` — module conventions and hard rules.

## Not included (by design)

Auth, database, transcoding/HLS/DASH, admin or upload UI, and deployment
configs beyond the local Dockerfile. See `docs/video-streaming-design.md` §14.
