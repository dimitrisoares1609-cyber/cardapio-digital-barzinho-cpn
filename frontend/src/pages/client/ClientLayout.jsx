import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ReceiptText, ShoppingBag } from 'lucide-react';
import Brand from '../../components/Brand.jsx';
import { TABLE_QR_TTL, useCart } from '../../context/CartContext.jsx';
import { formatPrice } from '../../lib/format.js';

export default function ClientLayout() {
  const { count, total, customer, setCustomer } = useCart();
  const [params] = useSearchParams();
  const location = useLocation();
  const [bump, setBump] = useState(false);
  const lastCount = useRef(count);

  // QR Code da mesa: /?mesa=7&t=<código> preenche a mesa e guarda o código assinado da plaquinha
  useEffect(() => {
    const mesa = params.get('mesa');
    const token = params.get('t');
    if (!mesa) return;
    if (mesa !== customer.table || token !== customer.tableToken) {
      setCustomer({ table: mesa.slice(0, 10), tableToken: token || null, tableAt: Date.now() });
    }
    // Tira o código da barra de endereço (não fica no histórico nem é compartilhado sem querer)
    if (token) window.history.replaceState(null, '', window.location.pathname);
  }, [params, customer.table, customer.tableToken, setCustomer]);

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
  // O selo da mesa só aparece depois de ler o QR code da plaquinha
  const hasQr = !!customer.table && !!customer.tableToken && Date.now() - (customer.tableAt || 0) < TABLE_QR_TTL;
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
        {hasQr && onMenu && <div className="table-chip">Mesa {customer.table}</div>}
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
