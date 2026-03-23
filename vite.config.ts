import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { URL } from 'url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/__agent_debug': {
        target: 'http://127.0.0.1:7658',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__agent_debug/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}); 