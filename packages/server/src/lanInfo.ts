import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';

function rank(ip: string): number {
  if (ip.startsWith('192.168.')) return 0;
  if (ip.startsWith('10.')) return 1;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && +m[1] >= 16 && +m[1] <= 31) return 2;
  return 3;
}

/** Non-internal IPv4 addresses, most likely home-Wi-Fi address first. */
export function lanAddresses(
  ifaces: Record<string, NetworkInterfaceInfo[] | undefined> = networkInterfaces(),
): string[] {
  const ips = Object.values(ifaces)
    .flatMap((list) => list ?? [])
    .filter((i) => (i.family === 'IPv4' || (i.family as unknown) === 4) && !i.internal && !i.address.startsWith('169.254.'))
    .map((i) => i.address);
  return [...new Set(ips)].sort((a, b) => rank(a) - rank(b));
}
