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
      '/api/stream':   { target: 'http://localhost:8000', changeOrigin: true, rewrite: () => '/chat/stream' },
      '/api/chat':     { target: 'http://localhost:8000', changeOrigin: true, rewrite: () => '/chat' },
      '/api/feedback': { target: 'http://localhost:8000', changeOrigin: true, rewrite: () => '/feedback' },
      '/api/analytics':{ target: 'http://localhost:8000', changeOrigin: true, rewrite: () => '/admin/analytics' },
      '/api/language':      { target: 'http://localhost:8000', changeOrigin: true, rewrite: () => '/language' },
      '/api/brand-config':  { target: 'http://localhost:8000', changeOrigin: true, rewrite: (p) => p.replace('/api/brand-config', '/brand-config').replace('brand=', 'token=') },
    },
  },
});
