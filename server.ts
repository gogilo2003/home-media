import http from 'node:http';
import { PORT } from './server/config.ts';
import { createHandler } from './server/router.ts';
import { lanAddresses } from './server/net.ts';

const server = http.createServer(createHandler());

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddresses();
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  if (lan.length) {
    for (const addr of lan) console.log(`  LAN:       http://${addr}:${PORT}`);
  } else {
    console.log('  LAN:       none detected — check your network connection');
  }
});
