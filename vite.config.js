import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mesicni-prehled/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
});
