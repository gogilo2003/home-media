---
name: range-streaming
description: Implement HTTP Range request handling for video streaming. Use when adding or debugging byte-range support, 206/416 responses, or seeking behavior.
---

# HTTP Range Streaming

## Where this code lives

| Concern | File |
|---|---|
| Range header parsing | `server/range.ts` |
| `/video/:id` handler | `server/stream.ts` |
| Path-traversal guard, id encoding | `server/ids.ts` |
| MIME lookup | `server/mime.ts` |
| Response helper | `server/http.ts` |

`server.ts` is the entry point and holds routing only — never put streaming
logic there. No module may exceed 80 lines.

Backend modules are TypeScript with **erasable syntax only**: no `enum`, no
`namespace`, no parameter properties, no decorators. Node strips the types at
load, so a wrong type runs happily until `npm run typecheck` catches it.

## When to use

- Adding a new streaming endpoint
- Debugging seek failures or incorrect Content-Range headers
- Reviewing 206 Partial Content responses

## Rules

- Always return `Accept-Ranges: bytes` on full responses
- Parse `Range: bytes=start-end` with regex `/^bytes=(\d*)-(\d*)$/`
- If `start` and `end` both present: validate `start <= end < size`
- If only `start`: `end = size - 1`
- If only `end` (suffix range, `bytes=-N`): `start = max(size - N, 0)`, `end = size - 1`. `-0` is unsatisfiable.
- Invalid range → `416` with `Content-Range: bytes */<size>` — on **every** `416` path, including a malformed header that fails the regex
- Multiple ranges (`bytes=0-9,20-29`) do not match the single-range regex → `416`
- Valid → `206` with `Content-Range: bytes <start>-<end>/<size>` and `Content-Length: <end - start + 1>`
- Use `fs.createReadStream(path, { start, end })` — never read the whole file

## Pitfalls

- Do not use `express.static` — it handles Range but you lose control over path validation
- Do not buffer the file in memory
- Do not forget the `Accept-Ranges` header on the `200` response
