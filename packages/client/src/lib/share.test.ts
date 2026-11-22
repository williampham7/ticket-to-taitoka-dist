import { describe, expect, it } from 'vitest';
import { shareUrlFor } from './share';

const at = (href: string) => {
  const u = new URL(href);
  return { protocol: u.protocol, hostname: u.hostname, port: u.port };
};

describe('share link', () => {
  it('uses the online (tunnel) address when the game is being played online, whatever address the host opened', () => {
    expect(shareUrlFor({ publicUrl: 'https://happy-trains.trycloudflare.com', lanIp: '192.168.0.9', page: at('http://localhost:8000/wait/x') }, 'ABC'))
      .toBe('https://happy-trains.trycloudflare.com/join/ABC');
    expect(shareUrlFor({ publicUrl: 'https://happy-trains.trycloudflare.com/', page: at('https://happy-trains.trycloudflare.com/wait/x') }, 'ABC'))
      .toBe('https://happy-trains.trycloudflare.com/join/ABC');
  });

  it('on the home network, swaps localhost for the Wi-Fi address and keeps the port', () => {
    expect(shareUrlFor({ lanIp: '192.168.0.9', page: at('http://localhost:8000/wait/x') }, 'ABC')).toBe('http://192.168.0.9:8000/join/ABC');
  });

  it('keeps the address the host already opened when it is not localhost', () => {
    expect(shareUrlFor({ lanIp: '192.168.0.9', page: at('http://192.168.0.9:5173/wait/x') }, 'ABC')).toBe('http://192.168.0.9:5173/join/ABC');
  });

  it('knows whether a link works from anywhere', async () => {
    const { isOnline } = await import('./share');
    expect(isOnline({ publicUrl: 'https://x.trycloudflare.com' })).toBe(true);
    expect(isOnline({ publicUrl: null })).toBe(false);
  });
});
