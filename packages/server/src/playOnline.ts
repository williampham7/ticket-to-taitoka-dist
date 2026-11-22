/**
 * `npm run play:online` — host a game your family can join from anywhere.
 * Starts a free Cloudflare quick tunnel (a temporary public https address that forwards to this computer),
 * then the game server, then opens the game at the public address so the share link works for everyone.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as dns } from 'node:dns';
import { SERVER_TITLE } from './title';
import { openBrowser } from './openBrowser';
import { cloudflaredCandidates, cloudflaredDownload, findTunnelUrl, localCloudflared, tunnelHost, tunnelRegistered } from './tunnel';

const PORT = Number(process.env.PORT ?? 8000);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const children: ChildProcess[] = [];

const say = (msg = '') => console.log(msg);
const fail = (msg: string): never => {
  console.error(`\n  ${msg}\n`);
  shutdown(1);
  throw new Error(msg);
};

function shutdown(code = 0) {
  for (const c of children) if (!c.killed) c.kill();
  process.exit(code);
}
process.on('SIGINT', () => { say('\n  Stopping the game and the tunnel…'); shutdown(0); });
process.on('SIGTERM', () => shutdown(0));

function findCloudflared(): string | null {
  for (const c of cloudflaredCandidates(process.env)) {
    if (c !== 'cloudflared' && !fs.existsSync(c)) continue;
    const r = spawnSync(c, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (r.status === 0) return c;
  }
  return null;
}

/** First run: fetch Cloudflare's standalone cloudflared.exe into your user folder (about 60 MB, once). */
async function downloadCloudflared(): Promise<string | null> {
  const url = cloudflaredDownload(process.platform, process.arch);
  const dest = localCloudflared(process.env);
  if (!url || !dest) return null;
  say("  First time online: downloading Cloudflare's tunnel program (about 60 MB, only once)...");
  const res = await fetch(url);
  if (!res.ok) return null;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.download`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
  const ok = spawnSync(dest, ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
  if (ok) say(`  Saved to ${dest}`);
  return ok ? dest : null;
}

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer().once('error', () => resolve(false)).once('listening', () => s.close(() => resolve(true)));
    s.listen(port);
  });
}

/** Resolves with the public address once cloudflared has both printed it and connected to Cloudflare. */
function startTunnel(bin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { windowsHide: true });
    children.push(t);
    const timer = setTimeout(() => reject(new Error('Cloudflare did not hand out an address within 60 seconds. Check the internet connection and try again.')), 60_000);
    let url: string | null = null;
    let registered = false;
    const onData = (buf: Buffer) => {
      for (const line of buf.toString().split(/\r?\n/)) {
        url ??= findTunnelUrl(line);
        registered ||= tunnelRegistered(line);
      }
      if (url && registered) { clearTimeout(timer); resolve(url); }
    };
    t.stdout.on('data', onData);
    t.stderr.on('data', onData);
    t.on('exit', (code) => { clearTimeout(timer); reject(new Error(`cloudflared stopped (exit code ${code}).`)); });
  });
}

function startServer(publicUrl: string) {
  const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const s = spawn(process.execPath, [tsx, path.join(root, 'packages', 'server', 'src', 'index.ts')], {
    env: { ...process.env, PORT: String(PORT), PUBLIC_URL: publicUrl },
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(s);
  s.on('exit', (code) => { if (code) fail(`The game server stopped (exit code ${code}).`); });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A new quick-tunnel name only exists a second or two after cloudflared prints it. Looking it up any
 * earlier through this computer makes Windows, the router and the internet provider remember
 * "no such site" for minutes, which is exactly the "This site can't be reached" page. So ask
 * Cloudflare's own nameservers directly (they never cache a miss) until the name is really there.
 */
async function waitForPublicDns(host: string) {
  try {
    const system = new dns.Resolver();
    const zone = host.split('.').slice(-2).join('.');
    const names = await system.resolveNs(zone);
    const ips = (await Promise.all(names.map((n) => system.resolve4(n).catch(() => [] as string[])))).flat();
    if (!ips.length) throw new Error('no nameserver addresses');
    const authoritative = new dns.Resolver({ timeout: 3000, tries: 1 });
    authoritative.setServers(ips);
    const until = Date.now() + 60_000;
    while (Date.now() < until) {
      try {
        if ((await authoritative.resolve4(host)).length) { await sleep(1000); return; }
      } catch { /* not yet */ }
      await sleep(1000);
    }
  } catch {
    // Direct nameserver lookups blocked on this network: just give the name plenty of time.
    await sleep(15_000);
  }
}

/** Check the public address end to end from this computer before telling anyone to open it. */
async function waitUntilReachable(url: string) {
  const until = Date.now() + 120_000;
  let flushed = false;
  const started = Date.now();
  while (Date.now() < until) {
    try {
      const r = await fetch(`${url}/api/lan-info`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) return;
    } catch {
      // If an earlier lookup left "no such site" in Windows' DNS cache, clear it once (no admin needed).
      if (!flushed && Date.now() - started > 10_000) {
        flushed = true;
        spawnSync('ipconfig', ['/flushdns'], { windowsHide: true, stdio: 'ignore' });
      }
    }
    await sleep(1500);
  }
  fail('The online address never answered. Try again in a minute, or use npm run play to play on the same Wi-Fi.');
}

async function main() {
  if (!fs.existsSync(path.join(root, 'packages', 'client', 'dist', 'index.html'))) {
    fail('The game has not been built yet. Run npm run play:online (it builds first), or npm run build.');
  }
  const bin = findCloudflared() ?? (await downloadCloudflared().catch(() => null)) ?? fail(
    'Could not find or download cloudflared. Install it once with:\n\n    winget install --id Cloudflare.cloudflared\n\n  then open a new terminal and run npm run play:online again.',
  );
  if (!(await portFree(PORT))) {
    fail(`Port ${PORT} is already in use. Is the game already running (npm run play)? Stop it first, or choose another port, e.g. set PORT=8010.`);
  }

  say('\n  Opening an online connection with Cloudflare…');
  const url = await startTunnel(bin).catch((e: Error) => fail(e.message));
  say('  Waiting for the online address to come alive (this can take a few seconds)…');
  await waitForPublicDns(tunnelHost(url));
  startServer(url);
  await waitUntilReachable(url);

  const line = '─'.repeat(Math.max(48, url.length + 6));
  say(`\n  ${line}`);
  say(`   ${SERVER_TITLE} is online!`);
  say(`   Open:  ${url}`);
  say('   Then host a game and send the link it shows to your family.');
  say('   Keep this window open and this computer awake while you play.');
  say(`   If a browser says the site can't be reached, wait a minute and refresh.`);
  say('   Press Ctrl+C to stop.');
  say(`  ${line}\n`);

  if (!process.argv.includes('--no-open')) {
    openBrowser(url);
  }
}

void main();
