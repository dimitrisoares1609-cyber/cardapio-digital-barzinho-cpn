import { Router } from 'express';
import { getPublicMenu } from '../services/menu.service.js';

const router = Router();

// Cardápio completo agrupado por categoria (usado pela tela do cliente)
router.get('/', async (_req, res) => {
  res.json({ categories: await getPublicMenu() });
});

export default router;
