import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam, orderBody, ordersQuery, statusBody, trackingParam } from '../schemas.js';
import * as orders from '../services/orders.service.js';
import { emitOrderCreated, emitOrderUpdated } from '../realtime/socket.js';

const router = Router();

// Limite folgado: no bar vários clientes podem sair pelo mesmo IP (Wi-Fi da casa)
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Muitos pedidos em sequência. Aguarde um pouco.' } }),
});

// Cliente envia o pedido (RF004)
router.post('/', createLimiter, validate(orderBody), async (req, res) => {
  const order = await orders.createOrder(req.valid.body);
  emitOrderCreated(order);
  res.status(201).json({ order: orders.toPublicOrder(order) });
});

// Cliente acompanha o pedido pelo código recebido na confirmação
router.get('/track/:code', validate(trackingParam, 'params'), async (req, res) => {
  res.json({ order: await orders.getOrderByTrackingCode(req.valid.params.code) });
});

// ----- Rotas do administrador -----

router.get('/', requireAuth, validate(ordersQuery, 'query'), async (req, res) => {
  res.json({ orders: await orders.listOrders(req.valid.query) });
});

router.get('/:id', requireAuth, validate(idParam, 'params'), async (req, res) => {
  res.json({ order: await orders.getOrderById(req.valid.params.id) });
});

// Atualiza o status e grava no histórico quem alterou (RF008)
router.patch('/:id/status', requireAuth, validate(idParam, 'params'), validate(statusBody), async (req, res) => {
  const order = await orders.updateOrderStatus(req.valid.params.id, req.valid.body.status, req.admin);
  emitOrderUpdated(order);
  res.json({ order });
});

export default router;
