#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {lanAddresses} from '../server/net.ts';

const OUT = path.resolve('certs');
const caKey = path.join(OUT, 'ca-key.pem');
const caCert = path.join(OUT, 'ca-cert.pem');
const key = path.join(OUT, 'server-key.pem');
const cert = path.join(OUT, 'server-cert.pem');

function openssl(args) {
  execFileSync('openssl', args, {stdio: 'inherit'});
}

function printHelp() {
  console.log(`Usage: node scripts/gen-certs.mjs [ip ...]

Mints a local CA (reused if present) and an IP-SAN server certificate under
certs/. With no IPs, the LAN addresses detected by server/net.ts are used.

Outputs (gitignored, keys mode 600):
  certs/ca-cert.pem    install once on the phone as a user CA
  certs/server-cert.pem, certs/server-key.pem

Then: TLS_KEY=certs/server-key.pem TLS_CERT=certs/server-cert.pem npm start`);
}

function ensureCa() {
  if (fs.existsSync(caKey) && fs.existsSync(caCert)) return console.log('Reusing existing local CA.');
  console.log('Creating local CA ...');
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '3650',
    '-keyout', caKey, '-out', caCert, '-subj', '/CN=video-platform local CA',
    '-addext', 'basicConstraints=critical,CA:TRUE']);
}

function sign(addresses) {
  const csr = path.join(OUT, 'server.csr');
  const ext = path.join(OUT, 'server.ext');
  fs.writeFileSync(ext, `subjectAltName=${addresses.map((ip) => `IP:${ip}`).join(',')}\n`
    + 'extendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n');
  console.log(`Signing server cert for ${addresses.join(', ')} ...`);
  openssl(['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', csr,
    '-subj', '/CN=video-platform']);
  openssl(['x509', '-req', '-in', csr, '-CA', caCert, '-CAkey', caKey,
    '-CAcreateserial', '-days', '825', '-out', cert, '-extfile', ext]);
  fs.rmSync(csr);
  fs.rmSync(ext);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return printHelp();
  const targets = args.filter((a) => !a.startsWith('-'));
  const addresses = targets.length ? targets : lanAddresses();
  if (!addresses.length) {
    console.error('No LAN addresses detected; pass one or more IPs explicitly.');
    process.exit(1);
  }
  fs.mkdirSync(OUT, {recursive: true});
  ensureCa();
  sign(addresses);
  fs.chmodSync(caKey, 0o600);
  fs.chmodSync(key, 0o600);
  const fingerprint = execFileSync('openssl', ['x509', '-in', caCert, '-noout', '-fingerprint', '-sha256'])
    .toString().trim();
  console.log(`\nCA   ${caCert}\n${fingerprint}`);
  console.log(`Leaf ${cert}  (SAN: ${addresses.join(', ')})`);
  console.log(`\nStart: TLS_KEY=${key} TLS_CERT=${cert} npm start`);
  console.log('\nPhone: Settings > Security & location > Encryption & credentials');
  console.log(`  > Install from storage > CA certificate, pick ${caCert} (needs a screen lock).`);
}

main();
