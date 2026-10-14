import http from 'node:http';
import { PORT, STATIC_ROUTES } from './server/config.ts';
import { send, serveStatic } from './server/http.ts';
import { listVideos } from './server/videos.ts';
import { streamVideo } from './server/stream.ts';
import { lanAddresses } from './server/net.ts';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed');
    }
    const file = STATIC_ROUTES[url.pathname];
    if (file) return await serveStatic(res, file);
    if (url.pathname === '/api/videos') {
      const vids = await listVideos();
      const { toApiResponse } = await import('./server/api.ts');
      return send(res, 200, JSON.stringify(toApiResponse(vids)), { 'Content-Type': 'application/json' });
    }
    if (url.pathname.startsWith('/video/')) {
      return await streamVideo(req, res, decodeURIComponent(url.pathname.slice(7)));
    }
    send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    if (res.headersSent) res.destroy();
    else send(res, 500, 'Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddresses();
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  if (lan.length) {
    for (const addr of lan) console.log(`  LAN:       http://${addr}:${PORT}`);
  } else {
    console.log('  LAN:       none detected — check your network connection');
  }
  // console.log(`Video root: ${VIDEO_ROOT}`);
});