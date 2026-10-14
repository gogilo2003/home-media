import type { ByteRange } from '../types.ts';

// Returns { start, end } inclusive, or null for anything unsatisfiable.
// Handles explicit (a-b), open-ended (a-) and suffix (-n) forms.
export function parseRange(header: string, size: number): ByteRange | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m) return null;
  let start: number;
  let end: number;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (!n) return null;
    start = Math.max(size - n, 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Number(m[2]);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || end >= size) return null;
  return { start, end };
}