import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../db/pool.js';
import { STATUS_LABELS } from '../schemas.js';
import { HttpError } from '../utils/http-error.js';

const round = (value) => Math.round(value * 100) / 100;

/**
 * Calcula o preço unitário de um item a partir das opções escolhidas.
 * O preço é sempre calculado no servidor; o valor enviado pelo navegador é ignorado.
 */
export function priceWithOptions(menuItem, selected = {}) {
  const groups = menuItem.options ?? [];
  const knownGroups = new Set(groups.map((g) => g.id));

  const unknown = Object.keys(selected).find((groupId) => !knownGroups.has(groupId));
  if (unknown) {
    throw HttpError.unprocessable(`Opção "${unknown}" não existe para ${menuItem.name}`);
  }

  let unitPrice = Number(menuItem.price);
  const chosen = [];

  for (const group of groups) {
    const value = selected[group.id];
    const ids = value == null ? [] : Array.isArray(value) ? value : [value];

    if (group.type === 'single' && ids.length > 1) {
      throw HttpError.unprocessable(`Escolha apenas uma opção em "${group.name}" para ${menuItem.name}`);
    }
    if (group.required && ids.length === 0) {
      throw HttpError.unprocessable(`Escolha uma opção em "${group.name}" para ${menuItem.name}`);
    }

    for (const id of ids) {
      const choice = group.choices.find((c) => c.id === id);
      if (!choice) {
        throw HttpError.unprocessable(`Opção inválida em "${group.name}" para ${menuItem.name}`);
      }
      unitPrice += Number(choice.priceDelta || 0);
      chosen.push({ groupId: group.id, group: group.name, choiceId: choice.id, choice: choice.name, priceDelta: choice.priceDelta || 0 });
    }
  }

  return { unitPrice: round(unitPrice), options: chosen };
}

function mapHistory(row, { includeAuthor }) {
  return {
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    changedAt: row.changed_at,
    ...(includeAuthor ? { changedBy: row.changed_by, changedByName: row.changed_by_name } : {}),
  };
}

function mapOrder(row, items, history, { includeAuthor = true } = {}) {
  return {
    id: row.id,
    number: row.id,
    trackingCode: row.tracking_code,
    customerName: row.customer_name,
    tableNumber: row.table_number,
    notes: row.notes,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menu_item_id,
      name: i.item_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      options: i.options,
      notes: i.notes,
      subtotal: i.subtotal,
    })),
    history: history.map((h) => mapHistory(h, { includeAuthor })),
  };
}

// Busca itens e histórico de vários pedidos com 2 consultas (evita N+1)
async function hydrate(orderRows, options) {
  if (orderRows.length === 0) return [];
  const ids = orderRows.map((o) => o.id);
  const [items, history] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [ids]),
    query('SELECT * FROM order_status_history WHERE order_id = ANY($1) ORDER BY changed_at, id', [ids]),
  ]);
  return orderRows.map((o) =>
    mapOrder(
      o,
      items.rows.filter((i) => i.order_id === o.id),
      history.rows.filter((h) => h.order_id === o.id),
      options,
    ),
  );
}

export async function getOrderById(id) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!rows[0]) throw HttpError.notFound('Pedido não encontrado');
  const [order] = await hydrate(rows);
  return order;
}

// Versão pública (acompanhamento pelo cliente): não expõe quem alterou o status
export async function getOrderByTrackingCode(code) {
  const { rows } = await query('SELECT * FROM orders WHERE tracking_code = $1', [code]);
  if (!rows[0]) throw HttpError.notFound('Pedido não encontrado');
  const [order] = await hydrate(rows, { includeAuthor: false });
  return order;
}

export function toPublicOrder(order) {
  return {
    ...order,
    history: order.history.map(({ changedBy, changedByName, ...rest }) => rest),
  };
}

const PERIOD_SQL = {
  today: "o.created_at >= date_trunc('day', now())",
  '7d': "o.created_at >= now() - interval '7 days'",
  '30d': "o.created_at >= now() - interval '30 days'",
  all: 'TRUE',
};

export async function listOrders({ status = [], period = 'today', limit = 200 } = {}) {
  const params = [];
  const where = [PERIOD_SQL[period]];
  if (status.length) {
    params.push(status);
    where.push(`o.status = ANY($${params.length})`);
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT o.* FROM orders o WHERE ${where.join(' AND ')} ORDER BY o.created_at DESC LIMIT $${params.length}`,
    params,
  );
  return hydrate(rows);
}

export async function createOrder(input) {
  const ids = [...new Set(input.items.map((i) => i.itemId))];
  const { rows: menuRows } = await query('SELECT * FROM menu_items WHERE id = ANY($1)', [ids]);
  const menuById = new Map(menuRows.map((m) => [m.id, m]));

  const lines = input.items.map((line) => {
    const menuItem = menuById.get(line.itemId);
    if (!menuItem) {
      throw HttpError.unprocessable(`Item ${line.itemId} não existe mais no cardápio`);
    }
    if (!menuItem.available) {
      throw HttpError.unprocessable(`${menuItem.name} está indisponível no momento`);
    }
    const { unitPrice, options } = priceWithOptions(menuItem, line.options);
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice,
      quantity: line.quantity,
      options,
      notes: line.notes,
      subtotal: round(unitPrice * line.quantity),
    };
  });

  const total = round(lines.reduce((sum, l) => sum + l.subtotal, 0));

  const orderId = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO orders (tracking_code, customer_name, table_number, notes, total)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [randomUUID(), input.customerName, input.tableNumber, input.notes, total],
    );
    const id = rows[0].id;

    for (const l of lines) {
      await db.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, options, notes, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, l.menuItemId, l.name, l.unitPrice, l.quantity, JSON.stringify(l.options), l.notes, l.subtotal],
      );
    }

    await db.query(
      `INSERT INTO order_status_history (order_id, status, changed_by, changed_by_name)
       VALUES ($1, 'recebido', NULL, $2)`,
      [id, `Cliente (${input.customerName})`],
    );
    return id;
  });

  return getOrderById(orderId);
}

export async function updateOrderStatus(id, status, admin) {
  await withTransaction(async (db) => {
    const { rows } = await db.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw HttpError.notFound('Pedido não encontrado');
    if (rows[0].status === status) {
      throw HttpError.conflict(`O pedido já está com o status "${STATUS_LABELS[status]}"`);
    }

    await db.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
    await db.query(
      `INSERT INTO order_status_history (order_id, status, changed_by, changed_by_name)
       VALUES ($1, $2, $3, $4)`,
      [id, status, admin.id, admin.name],
    );
  });

  return getOrderById(id);
}
