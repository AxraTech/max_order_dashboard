import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // xlsx-js-style tries to access stream.Readable in browser — stub it out
      stream: path.resolve(__dirname, './src/utils/stream-stub.ts'),
    },
  },
  define: {
    // Required for some CJS-style packages that reference global
    global: 'globalThis',
  },
});

