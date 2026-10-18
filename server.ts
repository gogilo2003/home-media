import http from 'node:http';
import https from 'node:https';
import { PORT } from './server/config.ts';
import { createHandler } from './server/router.ts';
import { lanAddresses } from './server/net.ts';
import { tlsOptions } from './server/tls.ts';

const tls = tlsOptions();
const scheme = tls ? 'https' : 'http';
const server = tls ? https.createServer(tls, createHandler()) : http.createServer(createHandler());

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddresses();
  console.log(`Listening on ${scheme}://0.0.0.0:${PORT}`);
  if (lan.length) {
    for (const addr of lan) console.log(`  LAN:       ${scheme}://${addr}:${PORT}`);
  } else {
    console.log('  LAN:       none detected — check your network connection');
  }
});
