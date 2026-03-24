import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 3100, open: true },
  resolve: {
    alias: {
      '@bigpuddle/dot-engine-core': path.resolve(__dirname, '../core/src/index.ts'),
      '@bigpuddle/dot-engine-renderer': path.resolve(__dirname, '../renderer/src/index.ts'),
      '@bigpuddle/dot-engine-brand': path.resolve(__dirname, '../brand/src/index.ts'),
      '@bigpuddle/dot-engine-export': path.resolve(__dirname, '../export/src/index.ts'),
    },
  },
});
