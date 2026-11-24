import { Server } from 'socket.io';
import { config } from '../config.js';
import { verifyToken } from '../middlewares/auth.js';
import { query } from '../db/pool.js';
import { toPublicOrder } from '../services/orders.service.js';

/**
 * Comunicação em tempo real (WebSocket via Socket.IO).
 *
 * Salas:
 *  - "admins"             → painéis administrativos autenticados (recebem todos os pedidos)
 *  - "pedido:<código>"    → cliente acompanhando o próprio pedido
 *
 * Eventos emitidos pelo servidor:
 *  - order:created   (admins)              novo pedido
 *  - order:updated   (admins + cliente)    mudança de status
 *  - menu:updated    (todos)               cardápio alterado pelo admin
 */

let io;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins },
  });

  io.on('connection', async (socket) => {
    // O painel envia o JWT no handshake: io(url, { auth: { token } })
    const token = socket.handshake.auth?.token;
    const admin = typeof token === 'string' ? await verifyToken(token).catch(() => null) : null;
    if (admin) {
      socket.data.admin = admin;
      socket.join('admins');
      socket.join(`admin:${admin.id}`);
      // Derruba a conexão quando o token vence (o painel faz login de novo)
      const ms = admin.exp * 1000 - Date.now();
      const timer = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
      socket.on('disconnect', () => clearTimeout(timer));
    }

    // Cliente pede para acompanhar um pedido pelo código recebido na confirmação
    socket.on('order:track', async (code, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (typeof code !== 'string' || !UUID_RE.test(code)) return reply({ ok: false, error: 'Código inválido' });

      const { rowCount } = await query('SELECT 1 FROM orders WHERE tracking_code = $1', [code]).catch(() => ({ rowCount: 0 }));
      if (!rowCount) return reply({ ok: false, error: 'Pedido não encontrado' });

      socket.join(`pedido:${code}`);
      return reply({ ok: true });
    });

    socket.on('order:untrack', (code) => {
      if (typeof code === 'string') socket.leave(`pedido:${code}`);
    });
  });

  return io;
}

// Encerra as conexões em tempo real de um admin (ex.: depois de trocar a senha)
export function disconnectAdminSockets(adminId) {
  io?.in(`admin:${adminId}`).disconnectSockets(true);
}

export function emitOrderCreated(order) {
  io?.to('admins').emit('order:created', order);
}

export function emitOrderUpdated(order) {
  io?.to('admins').emit('order:updated', order);
  io?.to(`pedido:${order.trackingCode}`).emit('order:updated', toPublicOrder(order));
}

export function emitMenuUpdated(reason) {
  io?.emit('menu:updated', { reason, at: new Date().toISOString() });
}
