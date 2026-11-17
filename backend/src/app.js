import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { openapi } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { UPLOAD_DIR } from './services/storage.js';
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import itemsRoutes from './routes/items.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

export function createApp() {
  const app = express();

  // Atrás do nginx (docker-compose) o IP real vem em X-Forwarded-For
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: false, // a API responde JSON; o Swagger UI precisa de scripts próprios
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // imagens usadas pelo front em outra origem
    }),
  );
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '200kb' }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // Arquivos estáticos: ilustrações padrão dos itens e imagens enviadas (driver local)
  app.use('/seed-images', express.static(path.join(publicDir, 'seed-images'), { maxAge: '7d' }));
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok', uptime: Number(process.uptime().toFixed(1)) });
    } catch {
      res.status(503).json({ status: 'error', database: 'down' });
    }
  });

  // Documentação Swagger
  app.get('/api/docs.json', (_req, res) => res.json(openapi));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'API Cardápio Digital — Barzinho CPN',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, tryItOutEnabled: true },
    }),
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/items', itemsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/uploads', uploadsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
