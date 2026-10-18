import fs from 'node:fs';
import path from 'node:path';
import type { ServerOptions } from 'node:https';

const DEFAULT_KEY = path.resolve('certs', 'server-key.pem');
const DEFAULT_CERT = path.resolve('certs', 'server-cert.pem');

export function tlsOptions(): ServerOptions | null {
  const { TLS_KEY, TLS_CERT } = process.env;
  if ((TLS_KEY || TLS_CERT) && !(TLS_KEY && TLS_CERT)) {
    throw new Error('TLS misconfigured: set both TLS_KEY and TLS_CERT (or neither)');
  }

  const keyPath = TLS_KEY || DEFAULT_KEY;
  const certPath = TLS_CERT || DEFAULT_CERT;
  const haveKey = fs.existsSync(keyPath);
  const haveCert = fs.existsSync(certPath);
  if (!haveKey && !haveCert) return null;
  if (haveKey !== haveCert) {
    const missing = haveKey ? `cert ${certPath}` : `key ${keyPath}`;
    throw new Error(`TLS misconfigured: ${missing} not found`);
  }
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}
