import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthorized, setAuthToken } from '../lib/api.js';
import { load, remove, save } from '../lib/storage.js';

const STORAGE_KEY = 'barzinho:sessao';
const AuthContext = createContext(null);

// Lê a data de expiração do JWT (sem validar a assinatura; quem valida é a API)
function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

function initialSession() {
  const session = load(STORAGE_KEY, null);
  if (!session?.token || tokenExpiresAt(session.token) <= Date.now()) return null;
  setAuthToken(session.token);
  return session;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(initialSession);
  const [expired, setExpired] = useState(false);

  const logout = useCallback((reason) => {
    setAuthToken(null);
    remove(STORAGE_KEY);
    setSession(null);
    setExpired(reason === 'expired');
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    const next = { token: data.token, admin: data.admin };
    setAuthToken(next.token);
    save(STORAGE_KEY, next);
    setExpired(false);
    setSession(next);
    return next;
  }, []);

  // Atualiza o token (ex.: depois de trocar a senha)
  const updateSession = useCallback((token, admin) => {
    const next = { token, admin };
    setAuthToken(token);
    save(STORAGE_KEY, next);
    setSession(next);
  }, []);

  // Qualquer 401 em rota protegida encerra a sessão e volta para o login
  useEffect(() => onUnauthorized(() => logout('expired')), [logout]);

  // Encerra a sessão quando o token expira com a tela aberta
  useEffect(() => {
    if (!session) return undefined;
    const ms = tokenExpiresAt(session.token) - Date.now();
    const timer = setTimeout(() => logout('expired'), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
    return () => clearTimeout(timer);
  }, [session, logout]);

  // Confere no servidor se o token salvo ainda vale (ex.: segredo trocado)
  useEffect(() => {
    if (session) api('/api/auth/me', { auth: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ token: session?.token ?? null, admin: session?.admin ?? null, isAuthenticated: !!session, expired, login, logout, updateSession }),
    [session, expired, login, logout, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
