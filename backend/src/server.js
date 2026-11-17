import http from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime/socket.js';
import { pool } from './db/pool.js';
import { storage } from './services/storage.js';

const app = createApp();
const server = http.createServer(app);
initRealtime(server);

// Prepara o armazenamento de imagens em segundo plano (não impede a API de subir)
storage.init().catch((err) => console.error('[storage] armazenamento de imagens indisponível:', err.message));

server.listen(config.port, () => {
  console.log(`API rodando em ${config.publicUrl}`);
  console.log(`Documentação: ${config.publicUrl}/api/docs`);
  console.log(`Armazenamento de imagens: ${config.storage.driver}`);
});

// Encerramento limpo (Ctrl+C / docker stop)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
