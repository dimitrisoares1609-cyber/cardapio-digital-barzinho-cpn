import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ReceiptText, ShoppingBag } from 'lucide-react';
import Brand from '../../components/Brand.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { formatPrice } from '../../lib/format.js';

export default function ClientLayout() {
  const { count, total, customer, setCustomer } = useCart();
  const [params] = useSearchParams();
  const location = useLocation();
  const [bump, setBump] = useState(false);
  const lastCount = useRef(count);

  // QR Code da mesa: /?mesa=7 já preenche o número da mesa no pedido
  useEffect(() => {
    const mesa = params.get('mesa');
    if (mesa && mesa !== customer.table) setCustomer({ table: mesa.slice(0, 10) });
  }, [params, customer.table, setCustomer]);

  // Animação no contador sempre que um item é adicionado (feedback visual)
  useEffect(() => {
    if (count > lastCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      lastCount.current = count;
      return () => clearTimeout(t);
    }
    lastCount.current = count;
    return undefined;
  }, [count]);

  const onMenu = location.pathname === '/';
  const showCartBar = count > 0 && onMenu;

  return (
    <div className={`client ${showCartBar ? 'client--with-bar' : ''}`}>
      <header className="client-header">
        <div className="client-header__inner">
          <Link to="/" className="client-header__brand" aria-label="Ir para o cardápio">
            <Brand />
          </Link>
          <nav className="client-header__actions">
            <Link to="/meus-pedidos" className="header-btn" aria-label="Meus pedidos">
              <ReceiptText size={22} />
            </Link>
            <Link to="/carrinho" className={`header-btn header-btn--cart ${bump ? 'is-bumping' : ''}`} aria-label={`Ver pedido, ${count} itens`}>
              <ShoppingBag size={22} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </nav>
        </div>
        {customer.table && onMenu && <div className="table-chip">Mesa {customer.table}</div>}
      </header>

      <main className="client-main">
        <Outlet />
      </main>

      {showCartBar && (
        <Link to="/carrinho" className={`cart-bar ${bump ? 'is-bumping' : ''}`}>
          <span className="cart-bar__count">{count}</span>
          <span className="cart-bar__label">Ver pedido</span>
          <span className="cart-bar__total">{formatPrice(total)}</span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
