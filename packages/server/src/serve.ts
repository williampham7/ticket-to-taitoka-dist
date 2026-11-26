import { Server } from 'boardgame.io/server';
import serve from 'koa-static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BobolandGame, EgyptianGame, FleetGame, FrontlineGame } from '@boboland/shared';
import { WarfrontGame } from '@boboland/shared'; // Warfront
import { installWarfrontBots } from './warfrontBots'; // Warfront
import { KingdomGame } from '@boboland/shared'; // Kingdom
import { installKingdomBots } from './kingdomBots'; // Kingdom
import { BlockyGame } from '@boboland/shared'; // Blocky
import { installBlockyBots } from './blockyBots'; // Blocky
import { lanAddresses } from './lanInfo';
import { SERVER_TITLE } from './title';
import { openBrowser } from './openBrowser';
import { installBots } from './bots';
import { installParty } from './party';

const PORT = Number(process.env.PORT ?? 8000);
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');

// A fixed seed (E2E tests) makes shuffles reproducible.
const game = process.env.SEED ? { ...BobolandGame, seed: process.env.SEED } : BobolandGame;

// LAN-only game: accept any origin (phones/laptops on the home network use the host's IP).
// Frontline (2-player, hidden pieces) runs on the same server, lobby and chat relay under its own game name.
const frontline = process.env.SEED ? { ...FrontlineGame, seed: process.env.SEED } : FrontlineGame;
// Fleet (2-player naval game, hidden fleets) likewise, under the game name `fleet`.
const fleet = process.env.SEED ? { ...FleetGame, seed: process.env.SEED } : FleetGame;
// Egyptian War (2-5 players, real time) likewise, under the game name `egyptian`.
const egyptian = process.env.SEED ? { ...EgyptianGame, seed: process.env.SEED } : EgyptianGame;
// Warfront (2-6 players, territory conquest), under the game name `warfront`.
const warfront = process.env.SEED ? { ...WarfrontGame, seed: process.env.SEED } : WarfrontGame;
// Kingdom (2-4 players, shifting maze), under the game name `kingdom`.
const kingdom = process.env.SEED ? { ...KingdomGame, seed: process.env.SEED } : KingdomGame;
// Blocky (2-4 players, corner-touch polyominoes), under the game name `blocky`.
const blocky = process.env.SEED ? { ...BlockyGame, seed: process.env.SEED } : BlockyGame;
const server = Server({ games: [game, frontline, fleet, egyptian, warfront, kingdom, blocky], origins: [/.*/] });

// PUBLIC_URL is set by `npm run play:online` once the Cloudflare tunnel is up.
const PUBLIC_URL = process.env.PUBLIC_URL || null;

server.router.get('/api/lan-info', (ctx) => {
  ctx.body = { addresses: lanAddresses(), port: PORT, publicUrl: PUBLIC_URL };
});

installBots(server, { port: PORT });
installParty(server);
installWarfrontBots(server, { port: PORT }); // Warfront
installKingdomBots(server, { port: PORT }); // Kingdom
installBlockyBots(server, { port: PORT }); // Blocky

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
