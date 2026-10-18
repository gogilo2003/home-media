# Video Platform — Agent Instructions

Modular Node.js streaming server for the LAN. No framework. No database.
No auth. Just filesystem + HTTP.

## Architecture
- `server.ts` — entry point only: creates the server (HTTP, or HTTPS when certs
  are configured), listens, prints the banner.
- `server/` — backend modules, one concern each:
  - `config.ts` — `PORT`, `VIDEO_ROOT`, `PUBLIC_DIR`, static route map
  - `router.ts` — the request handler and route dispatch
  - `tls.ts` — opt-in TLS options from env or `certs/`
  - `http.ts` — response helper and static file serving
  - `ids.ts` — `encodeId` / `decodeId` / `safeResolve`
  - `mime.ts` — extension sets and MIME lookup
  - `net.ts` — LAN address discovery for the startup banner
  - `range.ts` — HTTP Range parsing
  - `file-stream.ts` — Range-aware file streaming
  - `stream.ts` — `/video/:id` streaming
  - `catalog.ts` — recursive scan + media typing (`byMediaType`)
  - `classify.ts` — `classifyMedia` / `cleanTitle` / `seriesParts`
  - `catalog-index.ts` — read/write `catalog/index.json`
  - `api.ts` — `/api/videos` response shape
  - `series.ts` — series grouping
  - `preview.ts` / `captions.ts` / `captions-api.ts` — thumbnails and subtitles
- `types.ts` — shared API contract (`Video`, `ByteRange`). Type-only; nothing is served.
- `public/` — static frontend. `app.js` is the thin entry, plain JavaScript,
  type-checked via JSDoc.
- `public/js/` — frontend ES modules, one concern each, all `// @ts-check`:
  `state.js` (catalog + filters), `browse.js` / `cards.js` / `hero.js` /
  `filters.js` / `pagination.js` (library view), `preview.js` (hover playback),
  `series.js` (show grouping), `watch.js` / `watchinfo.js` (watch view),
  `controls.js` (Plyr + captions), `player.js` / `navbuttons.js` / `playback.js`
  / `navigation.js` / `resume.js` (player commands, prev/next, resume store),
  `queue.js` / `queueui.js` (playback queue), `shortcuts.js` (keys + modal).
  Every module must be registered in `STATIC_ROUTES` (`server/config.ts`).
- `public/vendor/plyr/` — vendored Plyr 3.8.5 dist (`plyr.js`, `plyr.css`), committed
  as-is. Registered in `server/config.ts` `STATIC_ROUTES`. No other vendored code.
- `src/input.css` — Tailwind source. `public/styles.css` is generated.
- `videos/` — media directory (`VIDEO_ROOT`). Never commit its contents.
- `certs/` — generated TLS material (`ca-cert.pem`, server key/cert). Gitignored;
  never commit. Produced by `node scripts/gen-certs.mjs`.
- `docs/roadmaps/` — phase-by-phase work plans.

## TypeScript
- Node runs `.ts` directly via built-in type stripping. **No build step, no bundler.**
- `tsc --noEmit` is the only check; run it with `npm run typecheck`.
- **Erasable syntax only.** `enum`, `namespace`, parameter properties, and
  decorators all fail at runtime. Use `union` types and plain objects instead.
- Imports carry explicit extensions: `import { x } from './config.ts'`.
- Type-only imports must use `import type` — they are erased, so nothing ships.
- The browser cannot strip types, so `public/app.js` stays JavaScript and opts
  in with `// @ts-check`, referencing `types.ts` through JSDoc.

## Catalog & TMDB
- `npm run catalog` is the only writer of `catalog/index.json`; it loads `.env`
  via `node --env-file-if-exists=.env`. A shell-exported key still wins.
- `TMDB_API_KEY` / `TMDB_API_READ_ACCESS_TOKEN` are **build-time only**, read
  from env, never logged and never committed. `server.ts` never calls out and is
  never given `--env-file`.
- The contract is structural `mediaType` (`movie` / `series` / `music` / `other`)
  plus descriptive `genres` and a display `title`. The legacy `category` field
  was retired — do not reintroduce it.

## HTTPS / TLS
- TLS is **opt-in** and serves on the same port (3000) so browsers' HTTPS-First
  upgrade succeeds. `server/tls.ts` enables it when `TLS_KEY` + `TLS_CERT` are
  set, or when both default files exist under `certs/`.
- Certificates are minted locally with the system `openssl` via
  `node scripts/gen-certs.mjs [ip ...]`: a local CA (installed once per device)
  signs a leaf whose **SAN is the LAN IP**. No mkcert, no reverse proxy, no HSTS,
  no redirect.
- `certs/` and `*.key` are gitignored. Key material is **never committed and
  never logged**. `node:https` is built in — no new dependency.
- A cert is identity-bound to an IP; a changed DHCP lease means re-running the
  script.

## Current Work
Roadmap: `docs/roadmaps/https-lan.md`
Execute **one phase per session**. Run the phase's verification commands. Commit.
Stop and report. Do not proceed to the next phase without confirmation.

## Commands
| Purpose     | Command                                                                           |
|-------------|-----------------------------------------------------------------------------------|
| Run server  | `npm start`                                                                       |
| Typecheck   | `npm run typecheck`                                                               |
| Watch CSS   | `npm run css`                                                                     |
| Build CSS   | `npm run css:build`                                                               |
| Smoke test  | `curl -s http://localhost:3000/api/videos`                                        |
| Range test  | `curl -sD - -o /dev/null -H "Range: bytes=0-99" http://localhost:3000/video/<id>` |
| Verify UI   | `node scripts/verify-ui.mjs <shell\|browse\|preview\|player\|watch\|queue\|controls>` |

Start the server first; the UI harness reads `BASE` (default `http://localhost:3000`).

## Agent Routing
- **Streaming, Range, fs, path validation** → delegate to `@streamer` (`server/ids.js`, `server/range.js`, `server/stream.js`)
- **HTML/JS/Tailwind UI** → default agent
- **Docs, roadmap, AGENTS.md** → default agent

## Hard Rules
- Runtime deps: **none**. Dev deps: `tailwindcss` plus `typescript` and `@types/node` for checking.
- No HTTP framework (no Express, Fastify, Koa, Hono).
- No `dotenv`, `lodash`, `axios`, `node-fetch`, or any utility library.
- Every fs call using a **client-supplied or `id`-derived** path must pass it through `safeResolve()` first. Paths returned by `readdir()` under `VIDEO_ROOT` are already trusted and do not need it.
- Range requests: `206` with correct `Content-Range`, or `416`. Never `200`.
- Full responses include `Accept-Ranges: bytes`.
- No module may exceed **80 lines**. `server.ts` is a thin entry point and should stay under 50; if it grows, the logic belongs in `server/`.
- Player UI: vendored Plyr only, committed under `public/vendor/plyr/`. No other
  runtime deps; no MSE/HLS; `<video>` still handles seeking.

## MIME Types (use exactly)
| Extension | Content-Type       |
|-----------|--------------------|
| `.mp4`    | `video/mp4`        |
| `.webm`   | `video/webm`       |
| `.mkv`    | `video/x-matroska` |
| `.mov`    | `video/quicktime`  |
| `.m4v`    | `video/x-m4v`      |

## Commit Convention
One phase per commit. Format: `<type>: <summary>`
- `feat:` — new functionality (a roadmap phase)
- `fix:` — bug fix
- `chore:` — config, tooling, deps
- `docs:` — documentation only
- `refactor:` — no behavior change

Do not commit generated files (`public/styles.css`). It is gitignored.

## Stop and Ask Before
- Adding any runtime dependency
- Exceeding 80 lines in any module, or 50 in `server.ts`
- Touching anything in the "Deferred" list
- Changing the API response shape
- Adding new routes beyond `/`, `/api/videos`, `/video/:id`, and static assets
- Adding a new top-level directory, re-merging `server/` into one file, or converting `public/app.js` to `.ts` (the browser cannot strip types)

## Deferred (do not build without explicit approval)
- Auth, sessions, users, JWT
- Database (Postgres, SQLite, Redis, anything)
- Thumbnails, transcoding, FFmpeg, HLS, DASH
- Search, tags, categories, playlists
- Docker, CI/CD, deployment configs
- Admin UI, upload UI

## File Ownership
- New source files go in `src/` (build inputs) or `public/` (served assets).
- Backend modules go in `server/`, one concern per file, named after the concern
  (`range.js` for Range parsing, `ids.js` for id encoding, and so on).
- Do not create files at the repository root unless listed in Architecture above
  (`server.ts`, `types.ts`, `tailwind.config.js`, `package.json`, and the `.gitignore`).
- Do not create `lib/`, `utils/`, `helpers/`, or `services/` folders.
  `server/` is the only backend directory.