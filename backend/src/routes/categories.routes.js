import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { categoryBody, idParam } from '../schemas.js';
import * as menu from '../services/menu.service.js';
import { emitMenuUpdated } from '../realtime/socket.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json({ categories: await menu.listCategories() });
});

router.post('/', requireAuth, validate(categoryBody), async (req, res) => {
  const category = await menu.createCategory(req.valid.body);
  emitMenuUpdated('category:created');
  res.status(201).json({ category });
});

router.put('/:id', requireAuth, validate(idParam, 'params'), validate(categoryBody), async (req, res) => {
  const category = await menu.updateCategory(req.valid.params.id, req.valid.body);
  emitMenuUpdated('category:updated');
  res.json({ category });
});

router.delete('/:id', requireAuth, validate(idParam, 'params'), async (req, res) => {
  await menu.deleteCategory(req.valid.params.id);
  emitMenuUpdated('category:deleted');
  res.status(204).end();
});

export default router;
