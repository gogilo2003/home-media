import type { IncomingMessage, ServerResponse } from 'node:http';
import { STATIC_ROUTES } from './config.ts';
import { send, serveStatic } from './http.ts';
import { streamVideo } from './stream.ts';
import { servePreview } from './preview.ts';

export function createHandler(): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, 'Method not allowed');
      }
      const file = STATIC_ROUTES[url.pathname];
      if (file) return await serveStatic(res, file);
      if (url.pathname.startsWith('/catalog/previews/')) {
        return await servePreview(req, res, url.pathname.slice('/catalog/previews/'.length));
      }
      if (url.pathname === '/api/videos') {
        const { readCatalogVideos } = await import('./catalog-index.ts');
        const { toApiResponse } = await import('./api.ts');
        const videos = await readCatalogVideos();
        return send(res, 200, JSON.stringify(toApiResponse(videos)), { 'Content-Type': 'application/json' });
      }
      if (url.pathname.startsWith('/video/')) {
        return await streamVideo(req, res, decodeURIComponent(url.pathname.slice(7)));
      }
      if (url.pathname.startsWith('/captions/')) {
        const parts = url.pathname.slice(10).split('/');
        if (parts.length >= 2) {
          const cap = parts.pop()!;
          const vid = parts.join('/');
          const { serveCaption } = await import('./captions-api.ts');
          return await serveCaption(req, res, vid, cap);
        }
        return send(res, 404, 'Not found');
      }
      send(res, 404, 'Not found');
    } catch (err) {
      console.error(err);
      if (res.headersSent) res.destroy();
      else send(res, 500, 'Server error');
    }
  };
}
