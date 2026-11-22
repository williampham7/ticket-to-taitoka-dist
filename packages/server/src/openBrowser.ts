import { spawn } from 'node:child_process';

/** The command that opens a web address in the default browser on this kind of computer. */
export function browserCommand(platform: NodeJS.Platform, url: string): [string, string[]] {
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', url]];
  if (platform === 'darwin') return ['open', [url]];
  return ['xdg-open', [url]];
}

/** Open `url` in the default browser. Never fails the server: if no browser opens, the address is still printed. */
export function openBrowser(url: string): void {
  const [cmd, args] = browserCommand(process.platform, url);
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* no browser available: the address is printed in the console */
  }
}
