import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const PORT = process.env.PORT || 3000;
const VIDEO_ROOT = path.resolve(process.env.VIDEO_ROOT || './videos');
const PUBLIC_DIR = path.join(import.meta.dirname, 'public');

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const STATIC_ROUTES = {
  '/': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
};

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mov', '.m4v']);

const VIDEO_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
};

function mimeFor(ext) {
  return VIDEO_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

function encodeId(relPath) {
  return Buffer.from(relPath, 'utf8').toString('base64url');
}

function decodeId(id) {
  return Buffer.from(id, 'base64url').toString('utf8');
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(body)),
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

async function serveStatic(res, file) {
  const fullPath = path.join(PUBLIC_DIR, file);
  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'Content-Type': STATIC_TYPES[path.extname(file)] || 'application/octet-stream',
      'Content-Length': stat.size,
    });
    fs.createReadStream(fullPath).pipe(res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

// Paths come from readdir() under VIDEO_ROOT, so they are trusted and do not
// go through safeResolve() — that guard applies to client-supplied ids (Phase 3).
async function listVideos() {
  let entries;
  try {
    entries = await fsp.readdir(VIDEO_ROOT, { recursive: true, withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Video root not found: ${VIDEO_ROOT} — serving empty list`);
      return [];
    }
    throw err;
  }

  const videos = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
    const fullPath = path.join(entry.parentPath ?? entry.path, entry.name);
    const relPath = path.relative(VIDEO_ROOT, fullPath);
    try {
      const stat = await fsp.stat(fullPath);
      videos.push({
        id: encodeId(relPath),
        name: entry.name,
        path: relPath,
        size: stat.size,
      });
    } catch {
      // Entry vanished or is unreadable — skip it rather than fail the listing.
    }
  }
  videos.sort((a, b) => a.name.localeCompare(b.name));
  return videos;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendText(res, 405, 'Method not allowed');
    }
    const staticFile = STATIC_ROUTES[url.pathname];
    if (staticFile) return await serveStatic(res, staticFile);
    if (url.pathname === '/api/videos') return sendJson(res, 200, await listVideos());
    if (url.pathname.startsWith('/video/')) return sendText(res, 501, 'Not Implemented');
    sendText(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    if (res.headersSent) res.destroy();
    else sendText(res, 500, 'Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`Video root: ${VIDEO_ROOT}`);
});