import { describe, expect, it } from 'vitest';
import { cloudflaredCandidates, cloudflaredDownload, findTunnelUrl, localCloudflared, tunnelHost, tunnelRegistered } from '../src/tunnel';

describe('tunnel address', () => {
  it('finds the trycloudflare address in cloudflared output', () => {
    expect(findTunnelUrl('2026-11-14T22:00:00Z INF |  https://happy-little-trains.trycloudflare.com                              |')).toBe('https://happy-little-trains.trycloudflare.com');
    expect(findTunnelUrl('INF Requesting new quick Tunnel on trycloudflare.com...')).toBeNull();
    expect(findTunnelUrl('INF Registered tunnel connection connIndex=0')).toBeNull();
  });

  it('knows when the tunnel is connected to Cloudflare', () => {
    expect(tunnelRegistered('2026-11-15T00:38:32Z INF Registered tunnel connection connIndex=0 connection=630bd66b')).toBe(true);
    expect(tunnelRegistered('INF Requesting new quick Tunnel on trycloudflare.com...')).toBe(false);
  });

  it('gives the host name to look up', () => {
    expect(tunnelHost('https://happy-little-trains.trycloudflare.com')).toBe('happy-little-trains.trycloudflare.com');
  });
});

describe('finding cloudflared on Windows', () => {
  it('checks an explicit path first, then PATH, then the usual install folders', () => {
    const list = cloudflaredCandidates({ CLOUDFLARED: 'D:\\tools\\cloudflared.exe', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local', ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)' });
    expect(list[0]).toBe('D:\\tools\\cloudflared.exe');
    expect(list[1]).toBe('cloudflared');
    expect(list).toContain('C:\\Users\\me\\AppData\\Local\\Microsoft\\WinGet\\Links\\cloudflared.exe');
    expect(list).toContain('C:\\Program Files (x86)\\cloudflared\\cloudflared.exe');
    expect(list).toContain('C:\\Program Files\\cloudflared\\cloudflared.exe');
    expect(list).toContain('C:\\Users\\me\\AppData\\Local\\TicketToTaitoka\\cloudflared.exe');
  });

  it("downloads Cloudflare's official standalone build into your user folder when nothing is installed", () => {
    expect(localCloudflared({ LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' })).toBe('C:\\Users\\me\\AppData\\Local\\TicketToTaitoka\\cloudflared.exe');
    expect(cloudflaredDownload('win32', 'x64')).toBe('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
    expect(cloudflaredDownload('win32', 'arm64')).toBe('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-arm64.exe');
    expect(cloudflaredDownload('darwin', 'arm64')).toBeNull();
  });

  it('skips folders that are not set', () => {
    expect(cloudflaredCandidates({})).toEqual(['cloudflared']);
  });
});
