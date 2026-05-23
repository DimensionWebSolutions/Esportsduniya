import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // In dev, proxy /api/* and WebSocket upgrades to the local Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // WebSocket is now on the same port as HTTP (3001)
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
