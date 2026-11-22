import { Server } from 'boardgame.io/server';
import serve from 'koa-static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BobolandGame } from '@boboland/shared';
import { lanAddresses } from './lanInfo';
import { SERVER_TITLE } from './title';
import { openBrowser } from './openBrowser';
import { installBots } from './bots';

const PORT = Number(process.env.PORT ?? 8000);
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');

// A fixed seed (E2E tests) makes shuffles reproducible.
const game = process.env.SEED ? { ...BobolandGame, seed: process.env.SEED } : BobolandGame;

// LAN-only game: accept any origin (phones/laptops on the home network use the host's IP).
const server = Server({ games: [game], origins: [/.*/] });

// PUBLIC_URL is set by `npm run play:online` once the Cloudflare tunnel is up.
const PUBLIC_URL = process.env.PUBLIC_URL || null;

server.router.get('/api/lan-info', (ctx) => {
  ctx.body = { addresses: lanAddresses(), port: PORT, publicUrl: PUBLIC_URL };
});

installBots(server, { port: PORT });

if (fs.existsSync(indexHtml)) {
  server.app.use(serve(clientDist));
  // SPA fallback for client-side routes like /join/:matchID
  server.app.use(async (ctx, next) => {
    await next();
    const api = ['/games', '/api', '/socket.io', '/.well-known'].some((p) => ctx.path.startsWith(p));
    if (ctx.status === 404 && ctx.method === 'GET' && !api) {
      ctx.type = 'html';
      ctx.body = fs.createReadStream(indexHtml);
    }
  });
}

server.run(PORT, () => {
  const urls = lanAddresses().map((ip) => `http://${ip}:${PORT}`);
  console.log(`\n  ${SERVER_TITLE} is running on port ${PORT}`);
  console.log(`  This computer:  http://localhost:${PORT}`);
  for (const u of urls) console.log(`  On your Wi-Fi:  ${u}`);
  if (PUBLIC_URL) console.log(`  Online:         ${PUBLIC_URL}`);
  if (!fs.existsSync(indexHtml)) console.log('  (client not built yet — run `npm run build`, or use `npm run dev`)');
  console.log('');
  // `npm run play` (any version) passes --open, so the game appears in the browser by itself
  if (process.argv.includes('--open') && fs.existsSync(indexHtml)) openBrowser(`http://localhost:${PORT}`);
});
