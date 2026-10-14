---
name: range-streaming
description: Implement HTTP Range request handling for video streaming. Use when adding or debugging byte-range support, 206/416 responses, or seeking behavior.
---

# HTTP Range Streaming

## When to use

- Adding a new streaming endpoint
- Debugging seek failures or incorrect Content-Range headers
- Reviewing 206 Partial Content responses

## Rules

- Always return `Accept-Ranges: bytes` on full responses
- Parse `Range: bytes=start-end` with regex `/^bytes=(\d*)-(\d*)$/`
- If `start` and `end` both present: validate `start <= end < size`
- If only `start`: `end = size - 1`
- If only `end`: treat as last N bytes (`start = size - N`)
- Invalid range → `416` with `Content-Range: bytes */<size>`
- Valid → `206` with `Content-Range: bytes <start>-<end>/<size>` and `Content-Length: <end - start + 1>`
- Use `fs.createReadStream(path, { start, end })` — never read the whole file

## Pitfalls

- Do not use `express.static` — it handles Range but you lose control over path validation
- Do not buffer the file in memory
- Do not forget the `Accept-Ranges` header on the `200` response
