import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, History, Inbox, MessageSquareText, Printer, RefreshCw } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { printOrder } from '../../lib/printer.js';
import { ALL_STATUS, STATUS, formatDateTime, formatPrice, formatTime, isClosed, nextStatus, timeAgo } from '../../lib/format.js';
import { useAdmin } from './AdminLayout.jsx';

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'all', label: 'Todos' },
];

const createdInPeriod = (order, period) => {
  const created = new Date(order.createdAt);
  if (period === 'today') return created.toDateString() === new Date().toDateString();
  if (period === '7d') return Date.now() - created < 7 * 864e5;
  if (period === '30d') return Date.now() - created < 30 * 864e5;
  return true;
};

function OrderCard({ order, isNew, onAcknowledge, onChangeStatus, busy, now }) {
  const [showHistory, setShowHistory] = useState(false);
  const next = nextStatus(order.status);
  const action = STATUS.find((s) => s.id === order.status)?.action;

  return (
    <article className={`order-card order-card--${order.status} ${isNew ? 'order-card--new' : ''}`} onClick={isNew ? onAcknowledge : undefined}>
      {isNew && <span className="order-card__ribbon">Novo</span>}
      <header className="order-card__header">
        <div>
          <h3 className="order-card__number">#{order.number}</h3>
          <p className="order-card__who">
            Mesa <strong>{order.tableNumber}</strong> · {order.customerName}
          </p>
        </div>
        <div className="order-card__right">
          <StatusBadge status={order.status} />
          <span className="order-card__time" title={formatDateTime(order.createdAt)}>
            <Clock size={14} aria-hidden="true" /> {formatTime(order.createdAt)} · {timeAgo(order.createdAt, now)}
          </span>
        </div>
      </header>

      <ul className="order-card__items">
        {order.items.map((i) => (
          <li key={i.id}>
            <span className="qty">{i.quantity}×</span>
            <span className="name">
              {i.name}
              {i.options.length > 0 && <small>{i.options.map((o) => o.choice).join(' · ')}</small>}
              {i.notes && <em>“{i.notes}”</em>}
            </span>
            <span className="price">{formatPrice(i.subtotal)}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="order-card__notes">
          <MessageSquareText size={14} aria-hidden="true" /> {order.notes}
        </p>
      )}

      <div className="order-card__total">
        <span>Total</span>
        <strong>{formatPrice(order.total)}</strong>
      </div>

      <div className="order-card__actions">
        {next && (
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onChangeStatus(order, next)}>
            {busy ? 'Salvando...' : action}
          </button>
        )}
        <label className="select-inline">
          <span className="sr-only">Alterar status do pedido {order.number}</span>
          <select value={order.status} disabled={busy} onChange={(e) => onChangeStatus(order, e.target.value)}>
            {ALL_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowHistory((v) => !v);
          }}
          aria-expanded={showHistory}
        >
          <History size={16} /> Histórico
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={(e) => {
            e.stopPropagation();
            printOrder(order, { reprint: true });
          }}
          aria-label={`Imprimir pedido ${order.number}`}
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>

      {showHistory && (
        <ol className="order-card__history">
          {order.history.map((h, index) => (
            <li key={`${h.status}-${index}`}>
              <time>{formatDateTime(h.changedAt)}</time>
              <StatusBadge status={h.status} />
              <span>{h.changedByName}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/**
 * Lista de pedidos (RF007) e atualização de status (RF008).
 * Atualizada em tempo real pelos eventos order:created / order:updated.
 */
export default function OrdersPage() {
  const { socket } = useAdmin();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('today');
  const [newIds, setNewIds] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api(`/api/orders?period=${periodRef.current}&limit=300`, { auth: true });
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [period, fetchOrders]);

  // Eventos em tempo real
  useEffect(() => {
    if (!socket) return undefined;
    const upsert = (order) =>
      setOrders((list) => {
        const exists = list.some((o) => o.id === order.id);
        if (!exists && !createdInPeriod(order, periodRef.current)) return list;
        return exists ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
      });

    const onCreated = (order) => {
      upsert(order);
      setNewIds((s) => new Set(s).add(order.id));
    };
    const onUpdated = (order) => upsert(order);
    const onReconnect = () => fetchOrders({ silent: true });

    socket.on('order:created', onCreated);
    socket.on('order:updated', onUpdated);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:updated', onUpdated);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, fetchOrders]);

  // Atualiza o "há X min" e faz uma sincronização de segurança a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      fetchOrders({ silent: true });
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(ALL_STATUS.map((s) => [s.id, 0]));
    for (const o of orders) result[o.status] += 1;
    return result;
  }, [orders]);

  const visible = useMemo(() => {
    const list = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
    // pedidos em aberto primeiro (mais antigos no topo, para não esquecer ninguém), finalizados depois
    const open = list.filter((o) => !isClosed(o.status)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const done = list.filter((o) => isClosed(o.status));
    return [...open, ...done];
  }, [orders, filter]);

  const acknowledge = (id) =>
    setNewIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });

  const changeStatus = async (order, status) => {
    if (status === order.status) return;
    if (status === 'cancelado' && !window.confirm(`Cancelar o pedido #${order.number} da mesa ${order.tableNumber}? O cliente verá o pedido como cancelado.`)) return;
    setBusyId(order.id);
    acknowledge(order.id);
    try {
      const data = await api(`/api/orders/${order.id}/status`, { method: 'PATCH', body: { status }, auth: true });
      setOrders((list) => list.map((o) => (o.id === order.id ? data.order : o)));
      toast.show(`Pedido #${order.number}: ${data.order.statusLabel}`);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Novos pedidos aparecem aqui automaticamente.</p>
        </div>
        <div className="admin-page__tools">
          <label className="select-inline">
            <span className="sr-only">Período</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
          <button type="button" className="btn btn--ghost" onClick={() => fetchOrders()} aria-label="Atualizar lista">
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      <div className="status-filters" role="tablist" aria-label="Filtrar por status">
        <button type="button" role="tab" aria-selected={filter === 'all'} className="status-filter" onClick={() => setFilter('all')}>
          Todos <span>{orders.length}</span>
        </button>
        {ALL_STATUS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={filter === s.id}
            className={`status-filter status-filter--${s.id}`}
            onClick={() => setFilter(s.id)}
          >
            {s.label} <span>{counts[s.id]}</span>
          </button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <Spinner label="Carregando pedidos..." />
      ) : error && orders.length === 0 ? (
        <EmptyState icon={RefreshCw} title="Erro ao carregar pedidos" action={<button className="btn btn--primary" onClick={() => fetchOrders()}>Tentar novamente</button>}>
          {error.message}
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhum pedido por aqui">
          {filter === 'all' ? 'Assim que um cliente enviar um pedido ele aparece nesta tela.' : 'Nenhum pedido com esse status no período.'}
        </EmptyState>
      ) : (
        <div className="orders-grid">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              isNew={newIds.has(order.id)}
              onAcknowledge={() => acknowledge(order.id)}
              onChangeStatus={changeStatus}
              busy={busyId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
