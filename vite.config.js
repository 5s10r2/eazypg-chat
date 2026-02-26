import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://claude-booking-bot.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
