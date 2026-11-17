import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { load, save } from '../lib/storage.js';

/**
 * Estado do pedido em montagem (carrinho).
 * Fica em memória e no localStorage, então não se perde ao trocar de categoria,
 * abrir os detalhes de um item ou recarregar a página (RF003).
 */

const STORAGE_KEY = 'barzinho:carrinho';
const CartContext = createContext(null);

// Mesmo item com as mesmas opções e observação vira uma linha só (soma a quantidade)
const lineKey = (itemId, options, notes) => `${itemId}|${JSON.stringify(options)}|${(notes || '').trim()}`;

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { item, quantity, options, notes, unitPrice, optionLabels } = action;
      const key = lineKey(item.id, options, notes);
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l)),
        };
      }
      const line = {
        key,
        itemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        unitPrice,
        quantity,
        options,
        optionLabels,
        notes: (notes || '').trim(),
      };
      return { ...state, lines: [...state.lines, line] };
    }
    case 'quantity':
      return {
        ...state,
        lines: state.lines
          .map((l) => (l.key === action.key ? { ...l, quantity: Math.max(0, Math.min(50, action.quantity)) } : l))
          .filter((l) => l.quantity > 0),
      };
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
    case 'reprice':
      return {
        ...state,
        lines: state.lines.map((l) => (action.prices[l.key] != null ? { ...l, unitPrice: action.prices[l.key] } : l)),
      };
    case 'clear':
      return { ...state, lines: [] };
    case 'customer':
      return { ...state, customer: { ...state.customer, ...action.customer } };
    default:
      return state;
  }
}

const initialState = () => load(STORAGE_KEY, { lines: [], customer: { name: '', table: '' } });

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => save(STORAGE_KEY, state), [state]);

  const add = useCallback((payload) => dispatch({ type: 'add', ...payload }), []);
  const setQuantity = useCallback((key, quantity) => dispatch({ type: 'quantity', key, quantity }), []);
  const remove = useCallback((key) => dispatch({ type: 'remove', key }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const reprice = useCallback((prices) => dispatch({ type: 'reprice', prices }), []);
  const setCustomer = useCallback((customer) => dispatch({ type: 'customer', customer }), []);

  const value = useMemo(() => {
    const count = state.lines.reduce((sum, l) => sum + l.quantity, 0);
    const total = Math.round(state.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;
    return { lines: state.lines, customer: state.customer, count, total, add, setQuantity, remove, clear, reprice, setCustomer };
  }, [state, add, setQuantity, remove, clear, reprice, setCustomer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}
