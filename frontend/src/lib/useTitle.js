import { useEffect } from 'react';

const BASE = 'Barzinho CPN';

/** Título da aba do navegador por página (ex.: "Seu pedido · Barzinho CPN"). */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} · Cardápio`;
  }, [title]);
}
