import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = 'http://localhost:8000';

/**
 * One build for every edition (USA, China, Europe): the page picks its edition when it loads
 * (src/edition.ts), which also sets the tab title and the theme.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/games': api,
      '/api': api,
      '/socket.io': { target: api, ws: true },
    },
  },
  build: { chunkSizeWarningLimit: 1500 },
});
