import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { availabilityBody, idParam, itemBody, itemsQuery } from '../schemas.js';
import * as menu from '../services/menu.service.js';
import { storage } from '../services/storage.js';
import { emitMenuUpdated } from '../realtime/socket.js';

const router = Router();

// Lista completa (inclui indisponíveis) — uso do painel administrativo
router.get('/', requireAuth, validate(itemsQuery, 'query'), async (req, res) => {
  res.json({ items: await menu.listItems(req.valid.query) });
});

// Detalhes de um item (público)
router.get('/:id', validate(idParam, 'params'), async (req, res) => {
  res.json({ item: await menu.getItem(req.valid.params.id) });
});

router.post('/', requireAuth, validate(itemBody), async (req, res) => {
  const item = await menu.createItem(req.valid.body);
  emitMenuUpdated('item:created');
  res.status(201).json({ item });
});

router.put('/:id', requireAuth, validate(idParam, 'params'), validate(itemBody), async (req, res) => {
  const { previous, item } = await menu.updateItem(req.valid.params.id, req.valid.body);
  if (previous.imageUrl && previous.imageUrl !== item.imageUrl) {
    await storage.remove(previous.imageUrl);
  }
  emitMenuUpdated('item:updated');
  res.json({ item });
});

router.patch('/:id/availability', requireAuth, validate(idParam, 'params'), validate(availabilityBody), async (req, res) => {
  const item = await menu.setAvailability(req.valid.params.id, req.valid.body.available);
  emitMenuUpdated('item:updated');
  res.json({ item });
});

router.delete('/:id', requireAuth, validate(idParam, 'params'), async (req, res) => {
  const item = await menu.deleteItem(req.valid.params.id);
  await storage.remove(item.imageUrl);
  emitMenuUpdated('item:deleted');
  res.status(204).end();
});

export default router;
