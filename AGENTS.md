# Video Platform — Agent Instructions

## Architecture
Single-file Node.js server (`server.js`) using only built-in modules.
No framework. No database. No auth. Just filesystem + HTTP.

## Layout
- `server.js` — entire backend (routing, listing, streaming)
- `public/` — static frontend served by the same server
- `src/input.css` — Tailwind source; `public/styles.css` is generated
- `videos/` — the media directory (VIDEO_ROOT)

## Commands
- `node server.js` — run the server
- `npx tailwindcss -i ./src/input.css -o ./public/styles.css --watch` — build CSS
- `curl http://localhost:3000/api/videos` — smoke test

## Rules
- Use only Node built-ins + `tailwindcss` (dev dep). No Express, no lodash, no dotenv.
- All file paths must pass through `safeResolve()` before any fs call.
- Range requests must return 206 with correct Content-Range, or 416 if invalid.
- Keep `server.js` under ~150 lines. If it grows, we split, not bloat.
- Browser `<video>` handles seeking — do not add MSE or HLS logic.

## Deferred (do not add without asking)
- Auth, sessions, users
- Database (any kind)
- Thumbnails, transcoding, FFmpeg
- Search, tags, categories
- Docker