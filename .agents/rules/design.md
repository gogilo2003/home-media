---
name: design
description: Reference the streaming design draft for architecture, routes, range handling, and constraints.
---

# Video Streaming Design Draft
See `docs/video-streaming-design.md` for full details. Key constraints:
- No framework, no database. Filesystem + HTTP only.
- Routes: `/`, `/api/videos`, `/video/:id`, static assets.
- Range requests return 206/416 with correct headers; never 200 for valid ranges.
- Path validation via `safeResolve()` for client/id-derived paths.
- Erasable TypeScript only; one concern per module under `server/`, modules < 80 lines, `server.ts` < 50.
- Supported video extensions: .mp4, .webm, .mkv, .mov, .m4v.
