import { networkInterfaces } from 'node:os';

// Docker and VM bridges answer on their own subnet but are not reachable from a
// phone on your wifi, so listing them would just be noise.
const VIRTUAL_PREFIXES = [
  'br-',
  'docker',
  'veth',
  'virbr',
  'vmnet',
  'vboxnet',
  'utun',
  'tun',
  'tap',
];

function isVirtual(name: string): boolean {
  return VIRTUAL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** Non-internal IPv4 addresses, i.e. the ones a phone on the same LAN can reach. */
export function lanAddresses(): string[] {
  const found: string[] = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    if (isVirtual(name)) continue;
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) found.push(info.address);
    }
  }
  return found.sort();
}