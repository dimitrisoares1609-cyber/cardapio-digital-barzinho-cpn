import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento o Vite repassa /api, /socket.io e as imagens para a API (porta 3333).
// Assim o front usa endereços relativos e funciona igual atrás do nginx em produção.
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:3333';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/seed-images': API,
      '/socket.io': { target: API, ws: true },
    },
  },
});
