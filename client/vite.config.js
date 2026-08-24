import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local development only: forward browser API calls to the Express server.
// Docker/Nginx already provides the same `/api` forwarding in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
