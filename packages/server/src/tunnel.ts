import path from 'node:path';

/** The public address a Cloudflare quick tunnel prints when it is ready. */
export function findTunnelUrl(line: string): string | null {
  const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(line);
  return m ? m[0] : null;
}

/** cloudflared logs this once the tunnel is connected (the address goes live in DNS a second or two later). */
export function tunnelRegistered(line: string): boolean {
  return /Registered tunnel connection/i.test(line);
}

export function tunnelHost(url: string): string {
  return new URL(url).hostname;
}

/** Where cloudflared might be: an explicit CLOUDFLARED path, then PATH, then the usual Windows install folders. */
export function cloudflaredCandidates(env: Record<string, string | undefined>): string[] {
  const list: string[] = [];
  if (env.CLOUDFLARED) list.push(env.CLOUDFLARED);
  list.push('cloudflared');
  const win = path.win32;
  if (env.LOCALAPPDATA) list.push(win.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'));
  if (env['ProgramFiles(x86)']) list.push(win.join(env['ProgramFiles(x86)']!, 'cloudflared', 'cloudflared.exe'));
  if (env.ProgramFiles) list.push(win.join(env.ProgramFiles, 'cloudflared', 'cloudflared.exe'));
  const own = localCloudflared(env);
  if (own) list.push(own);
  return list;
}

/** Where `npm run play:online` keeps its own copy of cloudflared (no installer, no admin rights needed). */
export function localCloudflared(env: Record<string, string | undefined>): string | null {
  return env.LOCALAPPDATA ? path.win32.join(env.LOCALAPPDATA, 'TicketToTaitoka', 'cloudflared.exe') : null;
}

/** Cloudflare's official standalone Windows build for this machine, from their GitHub releases. */
export function cloudflaredDownload(platform: string, arch: string): string | null {
  if (platform !== 'win32') return null;
  const flavour = arch === 'arm64' ? 'arm64' : arch === 'ia32' ? '386' : 'amd64';
  return `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${flavour}.exe`;
}
