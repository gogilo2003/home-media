/**
 * Shared API contract between the server and the browser client.
 *
 * Every declaration here is erased at runtime — nothing from this file is
 * ever shipped or served. `server/` imports it with `import type`, and
 * `public/app.js` references it through JSDoc, so both sides are checked
 * against one definition.
 */

export type Category = 'Movies' | 'Music' | 'Series' | 'Other';

export interface Video {
  id: string;
  name: string;
  path: string;
  size: number;
  category?: Category;
  preview?: string;
  mtimeMs?: number;
}

export interface ByteRange {
  start: number;
  end: number;
}
