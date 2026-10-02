import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@omniflow/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@omniflow/network-engine': path.resolve(__dirname, '../../packages/network-engine/src')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
