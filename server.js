import http from 'node:http';
import { PORT, VIDEO_ROOT, STATIC_ROUTES } from './server/config.js';
import { send, serveStatic } from './server/http.js';
import { listVideos } from './server/videos.js';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed');
    }
    const file = STATIC_ROUTES[url.pathname];
    if (file) return await serveStatic(res, file);
    if (url.pathname === '/api/videos') {
      return send(res, 200, JSON.stringify(await listVideos()), { 'Content-Type': 'application/json' });
    }
    if (url.pathname.startsWith('/video/')) {
      // Phase 3 lands streaming here; until then the id is still refused as malformed.
      return send(res, 501, 'Not Implemented');
    }
    send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    if (res.headersSent) res.destroy();
    else send(res, 500, 'Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`Video root: ${VIDEO_ROOT}`);
});