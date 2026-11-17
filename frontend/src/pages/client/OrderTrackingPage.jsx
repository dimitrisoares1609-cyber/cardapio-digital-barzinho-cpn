import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChefHat, CircleCheck, HandPlatter, Inbox, PackageCheck, SearchX } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { STATUS, formatPrice, formatTime } from '../../lib/format.js';
import { getPublicSocket } from '../../lib/socket.js';

const ICONS = { recebido: Inbox, em_preparo: ChefHat, pronto: PackageCheck, entregue: HandPlatter };
const MESSAGES = {
  recebido: 'Recebemos seu pedido! Ele já está na fila.',
  em_preparo: 'Seu pedido está sendo preparado.',
  pronto: 'Seu pedido está pronto e já vai para a mesa.',
  entregue: 'Pedido entregue. Bom proveito!',
};

/**
 * Confirmação e acompanhamento do pedido em tempo real.
 * Cada alteração de status feita no painel chega aqui pelo Socket.IO.
 */
export default function OrderTrackingPage() {
  const { code } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const socket = getPublicSocket();

    const fetchOrder = () =>
      api(`/api/orders/track/${code}`)
        .then(({ order: data }) => !cancelled && setOrder(data))
        .catch((err) => !cancelled && setError(err));

    const track = () =>
      socket.timeout(5000).emit('order:track', code, (err, ack) => {
        if (!cancelled) setLive(!err && ack?.ok);
      });

    const onUpdated = (updated) => {
      if (updated.trackingCode !== code) return;
      setOrder(updated);
      toast.show(`Pedido #${updated.number}: ${updated.statusLabel}`, { type: 'info', duration: 5000 });
      navigator.vibrate?.(200);
    };
    // Reconectou? entra de novo na sala e busca o estado atual
    const onConnect = () => {
      track();
      fetchOrder();
    };
    const onDisconnect = () => setLive(false);

    fetchOrder();
    if (socket.connected) track();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:updated', onUpdated);

    return () => {
      cancelled = true;
      socket.emit('order:untrack', code);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:updated', onUpdated);
    };
  }, [code, toast]);

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon={SearchX}
          title="Pedido não encontrado"
          action={
            <Link to="/" className="btn btn--primary">
              Voltar ao cardápio
            </Link>
          }
        >
          {error.message}
        </EmptyState>
      </div>
    );
  }

  if (!order) return <Spinner label="Carregando pedido..." />;

  const currentIndex = STATUS.findIndex((s) => s.id === order.status);
  const timeFor = (status) => {
    const entry = [...order.history].reverse().find((h) => h.status === status);
    return entry ? formatTime(entry.changedAt) : null;
  };

  return (
    <div className="page tracking">
      {location.state?.justCreated && (
        <div className="tracking__success" role="status">
          <CircleCheck size={28} aria-hidden="true" />
          <div>
            <strong>Pedido enviado!</strong>
            <span>Guarde o número abaixo. Esta página atualiza sozinha.</span>
          </div>
        </div>
      )}

      <div className="tracking__header">
        <p className="tracking__label">Pedido</p>
        <p className="tracking__number">#{order.number}</p>
        <p className="tracking__meta">
          Mesa {order.tableNumber} · {order.customerName} · {formatTime(order.createdAt)}
        </p>
        <span className={`live ${live ? 'live--on' : ''}`}>{live ? 'Ao vivo' : 'Reconectando...'}</span>
      </div>

      <p className="tracking__message">{MESSAGES[order.status]}</p>

      <ol className="steps" aria-label="Andamento do pedido">
        {STATUS.map((step, index) => {
          const Icon = ICONS[step.id];
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li key={step.id} className={`step step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step__icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="step__label">{step.label}</span>
              <span className="step__time">{timeFor(step.id) ?? ''}</span>
            </li>
          );
        })}
      </ol>

      <section className="tracking__items">
        <h2>Itens</h2>
        <ul>
          {order.items.map((i) => (
            <li key={i.id}>
              <span className="qty">{i.quantity}×</span>
              <span className="name">
                {i.name}
                {i.options.length > 0 && <small>{i.options.map((o) => o.choice).join(' · ')}</small>}
                {i.notes && <small>“{i.notes}”</small>}
              </span>
              <span className="price">{formatPrice(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="cart-summary">
          <span>Total</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>
        {order.notes && <p className="tracking__notes">Obs.: {order.notes}</p>}
      </section>

      <Link to="/" className="btn btn--outline btn--block">
        Pedir mais alguma coisa
      </Link>
    </div>
  );
}
