# Video Platform — Agent Instructions

Single-file Node.js streaming server for the LAN. No framework. No database.
No auth. Just filesystem + HTTP.

## Architecture
- `server.js` — entire backend (routing, listing, streaming). Single file.
- `public/` — static frontend, served by the same server.
- `src/input.css` — Tailwind source. `public/styles.css` is generated.
- `videos/` — media directory (`VIDEO_ROOT`). Never commit its contents.
- `docs/roadmaps/` — phase-by-phase work plans.

## Current Work
Roadmap: `docs/roadmaps/v0.1.0-minimal.md`
Execute **one phase at a time**. Run the phase's verification commands. Commit.
Stop and report. Do not proceed to the next phase without confirmation.

## Commands
| Purpose    | Command                                                                           |
|------------|-----------------------------------------------------------------------------------|
| Run server | `npm start`                                                                       |
| Watch CSS  | `npm run css`                                                                     |
| Build CSS  | `npm run css:build`                                                               |
| Smoke test | `curl -s http://localhost:3000/api/videos`                                        |
| Range test | `curl -sD - -o /dev/null -H "Range: bytes=0-99" http://localhost:3000/video/<id>` |

## Agent Routing
- **Streaming, Range, fs, path validation** → delegate to `@streamer`
- **HTML/JS/Tailwind UI** → default agent
- **Docs, roadmap, AGENTS.md** → default agent

## Hard Rules
- Runtime deps: **none**. Dev deps: only `tailwindcss`.
- No HTTP framework (no Express, Fastify, Koa, Hono).
- No `dotenv`, `lodash`, `axios`, `node-fetch`, or any utility library.
- Every fs call using a **client-supplied or `id`-derived** path must pass it through `safeResolve()` first. Paths returned by `readdir()` under `VIDEO_ROOT` are already trusted and do not need it.
- Range requests: `206` with correct `Content-Range`, or `416`. Never `200`.
- Full responses include `Accept-Ranges: bytes`.
- `server.js` must stay under 150 lines. If a change pushes it over, stop and ask.
- Browser `<video>` handles seeking. Do not add MSE, HLS, or a player library.

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
- Exceeding 150 lines in `server.js`
- Touching anything in the "Deferred" list
- Changing the API response shape
- Adding new routes beyond `/`, `/api/videos`, `/video/:id`, and static assets

## Deferred (do not build without explicit approval)
- Auth, sessions, users, JWT
- Database (Postgres, SQLite, Redis, anything)
- Thumbnails, transcoding, FFmpeg, HLS, DASH
- Search, tags, categories, playlists
- Docker, CI/CD, deployment configs
- Admin UI, upload UI

## File Ownership
- New source files go in `src/` (build inputs) or `public/` (served assets).
- Do not create files at the repository root unless listed in Layout above.
- Do not create `lib/`, `utils/`, `helpers/`, or `services/` folders.
  `server.js` stays flat until a roadmap phase says otherwise.