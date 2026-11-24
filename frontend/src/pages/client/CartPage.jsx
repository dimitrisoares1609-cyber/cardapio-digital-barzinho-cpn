import { useTitle } from '../../lib/useTitle.js';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, QrCode, ShoppingBag, TriangleAlert } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import QuantityStepper from '../../components/QuantityStepper.jsx';
import { TABLE_QR_TTL, useCart } from '../../context/CartContext.jsx';
import { useMenu } from '../../context/MenuContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';
import { missingRequired, unitPrice } from '../../lib/pricing.js';
import { load, save } from '../../lib/storage.js';

export const MY_ORDERS_KEY = 'barzinho:meus-pedidos';

function validate({ name, table }) {
  const errors = {};
  if (name.trim().length < 2) errors.customerName = 'Informe seu nome';
  if (!table.trim()) errors.tableNumber = 'Informe o número da mesa';
  return errors;
}

/**
 * Revisão e envio do pedido (RF004): lista com quantidade, preço unitário e total,
 * ajuste/remoção de itens, dados do cliente e envio via HTTP POST.
 */
export default function CartPage() {
  useTitle('Seu pedido');
  const { lines, total, customer, setCustomer, setQuantity, remove, clear, reprice } = useCart();
  // Pedido só sai com o código do QR da mesa, lido nas últimas horas
  const hasQr = !!customer.tableToken && Date.now() - (customer.tableAt || 0) < TABLE_QR_TTL;
  const { itemsById, loading: menuLoading } = useMenu();
  const toast = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [sending, setSending] = useState(false);

  // Confere o carrinho com o cardápio atual: itens que saíram ou ficaram indisponíveis
  const unavailable = useMemo(() => {
    if (menuLoading || itemsById.size === 0) return new Set();
    return new Set(
      lines
        .filter((l) => {
          const item = itemsById.get(l.itemId);
          return !item || missingRequired(item, l.options);
        })
        .map((l) => l.key),
    );
  }, [lines, itemsById, menuLoading]);

  // Atualiza os preços caso o administrador tenha mudado algum valor
  useEffect(() => {
    const prices = {};
    for (const l of lines) {
      const item = itemsById.get(l.itemId);
      if (item) {
        const fresh = unitPrice(item, l.options);
        if (fresh !== l.unitPrice) prices[l.key] = fresh;
      }
    }
    if (Object.keys(prices).length) reprice(prices);
  }, [itemsById, lines, reprice]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validate(customer);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (unavailable.size) {
      setSubmitError('Remova os itens indisponíveis para continuar.');
      return;
    }

    setSending(true);
    try {
      const { order } = await api('/api/orders', {
        method: 'POST',
        body: {
          customerName: customer.name.trim(),
          tableNumber: customer.table.trim(),
          tableToken: customer.tableToken || null,
          notes: notes.trim() || null,
          items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, options: l.options, notes: l.notes || null })),
        },
      });

      const history = load(MY_ORDERS_KEY, []);
      save(MY_ORDERS_KEY, [{ code: order.trackingCode, number: order.number, total: order.total, createdAt: order.createdAt }, ...history].slice(0, 20));
      clear();
      navigate(`/pedido/${order.trackingCode}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      if (err.code === 'TABLE_QR_REQUIRED') setCustomer({ tableToken: null });
      if (err.status === 400) setErrors(err.fieldErrors());
      setSubmitError(err.message);
      toast.show(err.message, { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="page">
        <h1 className="sr-only">Seu pedido</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Seu pedido está vazio"
          action={
            <Link to="/" className="btn btn--primary">
              Ver cardápio
            </Link>
          }
        >
          Escolha os itens no cardápio e eles aparecem aqui.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page cart">
      <div className="page__top">
        <Link to="/" className="back-link">
          <ChevronLeft size={20} /> Continuar escolhendo
        </Link>
        <h1 className="page__title">Seu pedido</h1>
      </div>

      <ul className="cart-lines">
        {lines.map((line) => {
          const off = unavailable.has(line.key);
          return (
            <li key={line.key} className={`cart-line ${off ? 'cart-line--off' : ''}`}>
              <ItemImage src={line.imageUrl} alt="" className="cart-line__image" />
              <div className="cart-line__info">
                <p className="cart-line__name">{line.name}</p>
                {line.optionLabels?.length > 0 && <p className="cart-line__opts">{line.optionLabels.join(' · ')}</p>}
                {line.notes && <p className="cart-line__notes">“{line.notes}”</p>}
                {off ? (
                  <p className="cart-line__warn">
                    <TriangleAlert size={14} /> Indisponível no momento
                  </p>
                ) : (
                  <p className="cart-line__unit">{formatPrice(line.unitPrice)} cada</p>
                )}
              </div>
              <div className="cart-line__side">
                <span className="cart-line__subtotal">{formatPrice(line.unitPrice * line.quantity)}</span>
                <QuantityStepper
                  size="sm"
                  value={line.quantity}
                  allowRemove
                  onChange={(q) => (q < 1 ? remove(line.key) : setQuantity(line.key, q))}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="cart-summary">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>

      <form className="checkout" onSubmit={submit} noValidate>
        <h2 className="checkout__title">Seus dados</h2>
        <div className="checkout__row">
          <label className={`field ${errors.customerName ? 'field--error' : ''}`}>
            <span className="field__label">Nome</span>
            <input
              value={customer.name}
              onChange={(e) => {
                setCustomer({ name: e.target.value });
                setErrors(({ customerName: _removed, ...rest }) => rest);
              }}
              autoComplete="given-name"
              maxLength={80}
              placeholder="Como podemos te chamar?"
            />
            {errors.customerName && <span className="field__error">{errors.customerName}</span>}
          </label>
          <label className={`field field--small ${errors.tableNumber ? 'field--error' : ''}`}>
            <span className="field__label">Mesa</span>
            <input
              value={customer.table}
              onChange={(e) => {
                setCustomer({ table: e.target.value });
                setErrors(({ tableNumber: _removed, ...rest }) => rest);
              }}
              readOnly={hasQr}
              title={hasQr ? 'Mesa definida pelo QR code' : undefined}
              inputMode="numeric"
              maxLength={10}
              placeholder="Nº"
            />
            {errors.tableNumber && <span className="field__error">{errors.tableNumber}</span>}
          </label>
        </div>
        <label className="field">
          <span className="field__label">Observações do pedido / Sua localização (referência)</span>
          <textarea
            rows={2}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: trazer tudo junto · estou perto da TV, de camiseta azul"
          />
        </label>

        {!hasQr && (
          <p className="form-info" role="note">
            <QrCode size={18} aria-hidden="true" /> Para enviar, aponte a câmera do celular para o <b>QR code da sua mesa</b>. Os itens escolhidos continuam aqui.
          </p>
        )}

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={sending || !hasQr}>
          {sending ? 'Enviando...' : `Enviar pedido · ${formatPrice(total)}`}
        </button>
        <p className="checkout__hint">O pagamento é feito no caixa. Você acompanha o preparo pelo celular.</p>
      </form>
    </div>
  );
}
