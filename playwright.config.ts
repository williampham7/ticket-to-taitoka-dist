import { defineConfig, devices } from '@playwright/test';

const PORT = 8123;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // every visitor is asked for a name first: tests start with one (asName() in helpers.ts sets another)
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: 'boboland.myName', value: '"Tester"' }] }] },
    viewport: { width: 1440, height: 860 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 860 } } }],
  webServer: {
    // `npm run e2e` builds the client first; the server then serves it on one port.
    command: 'npx tsx packages/server/src/index.ts',
    url: `http://localhost:${PORT}/api/lan-info`,
    env: { PORT: String(PORT), SEED: 'e2e1', TTB_BOT_DELAY: '50' },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
