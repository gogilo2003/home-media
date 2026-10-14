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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendText(res, 405, 'Method not allowed');
    }
    const staticFile = STATIC_ROUTES[url.pathname];
    if (staticFile) return await serveStatic(res, staticFile);
    if (url.pathname === '/api/videos') return sendJson(res, 200, []);
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