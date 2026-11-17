import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { getPublicSocket } from '../lib/socket.js';

/**
 * Cardápio carregado da API (RF001). Quando o administrador altera algo,
 * o servidor emite "menu:updated" e a lista é recarregada sem recarregar a página.
 */

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const controllerRef = useRef(null);

  const reload = useCallback(async ({ silent = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!silent) setLoading(true);
    try {
      const data = await api('/api/menu', { signal: controller.signal });
      setCategories(data.categories);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const socket = getPublicSocket();
    const onMenuUpdated = () => reload({ silent: true });
    // ao reconectar, busca de novo caso alguma alteração tenha sido perdida
    const onReconnect = () => reload({ silent: true });
    socket.on('menu:updated', onMenuUpdated);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('menu:updated', onMenuUpdated);
      socket.io.off('reconnect', onReconnect);
      controllerRef.current?.abort();
    };
  }, [reload]);

  const value = useMemo(() => {
    const itemsById = new Map();
    for (const c of categories) for (const i of c.items) itemsById.set(i.id, i);
    return { categories, itemsById, loading, error, reload, updatedAt };
  }, [categories, loading, error, reload, updatedAt]);

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu precisa estar dentro de <MenuProvider>');
  return ctx;
}
