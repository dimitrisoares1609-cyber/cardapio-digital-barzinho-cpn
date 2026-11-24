import { useTitle } from '../../lib/useTitle.js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime, formatPrice } from '../../lib/format.js';
import { load } from '../../lib/storage.js';
import { MY_ORDERS_KEY } from './CartPage.jsx';

// Pedidos feitos neste aparelho (os códigos ficam salvos no navegador)
export default function MyOrdersPage() {
  useTitle('Meus pedidos');
  const [orders] = useState(() => load(MY_ORDERS_KEY, []));
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    orders.slice(0, 10).forEach((o) => {
      api(`/api/orders/track/${o.code}`)
        .then(({ order }) => setStatuses((s) => ({ ...s, [o.code]: order.status })))
        .catch(() => {});
    });
  }, [orders]);

  return (
    <div className="page">
      <div className="page__top">
        <Link to="/" className="back-link">
          <ChevronLeft size={20} /> Cardápio
        </Link>
        <h1 className="page__title">Meus pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Nenhum pedido ainda">
          Os pedidos feitos neste celular aparecem aqui.
        </EmptyState>
      ) : (
        <ul className="my-orders">
          {orders.map((o) => (
            <li key={o.code}>
              <Link to={`/pedido/${o.code}`} className="my-order">
                <span className="my-order__number">#{o.number}</span>
                <span className="my-order__info">
                  <span>{formatDateTime(o.createdAt, { withYear: new Date(o.createdAt).getFullYear() !== new Date().getFullYear() })}</span>
                  <strong>{formatPrice(o.total)}</strong>
                </span>
                {statuses[o.code] && <StatusBadge status={statuses[o.code]} />}
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
