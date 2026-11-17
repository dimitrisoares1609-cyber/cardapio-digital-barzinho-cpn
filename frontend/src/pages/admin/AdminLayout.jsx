import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, LayoutGrid, ListOrdered, LogOut, Tags, Volume2, VolumeX } from 'lucide-react';
import Brand from '../../components/Brand.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { API_URL } from '../../lib/api.js';
import { createAdminSocket } from '../../lib/socket.js';
import { playNewOrderSound } from '../../lib/sound.js';
import { load, save } from '../../lib/storage.js';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

/**
 * Estrutura do painel. Mantém a conexão Socket.IO autenticada e avisa sobre
 * novos pedidos (som + aviso na tela + contador no título da aba) em qualquer página do painel.
 */
export default function AdminLayout() {
  const { token, admin, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(() => load('barzinho:som', true));
  const [unseen, setUnseen] = useState(0);
  const soundRef = useRef(soundOn);
  const onOrdersPage = location.pathname === '/admin';
  const onOrdersRef = useRef(onOrdersPage);

  soundRef.current = soundOn;
  onOrdersRef.current = onOrdersPage;

  useEffect(() => {
    const s = createAdminSocket(token);
    setSocket(s);
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));
    s.on('order:created', (order) => {
      if (soundRef.current) playNewOrderSound();
      toast.show(`Novo pedido #${order.number} · Mesa ${order.tableNumber}`, { type: 'info', duration: 6000 });
      if (!onOrdersRef.current || document.hidden) setUnseen((n) => n + 1);
    });
    return () => s.close();
  }, [token, toast]);

  // Zera o contador ao abrir a tela de pedidos com a aba visível
  useEffect(() => {
    const clearIfVisible = () => onOrdersRef.current && !document.hidden && setUnseen(0);
    clearIfVisible();
    document.addEventListener('visibilitychange', clearIfVisible);
    return () => document.removeEventListener('visibilitychange', clearIfVisible);
  }, [onOrdersPage]);

  useEffect(() => {
    document.title = unseen > 0 ? `(${unseen}) Novo pedido · Painel` : 'Painel · Barzinho CPN';
  }, [unseen]);

  useEffect(() => () => {
    document.title = 'Barzinho CPN · Cardápio';
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    save('barzinho:som', next);
    if (next) playNewOrderSound();
  };

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return (
    <AdminContext.Provider value={value}>
      <div className="admin">
        <header className="admin-header">
          <div className="admin-header__brand">
            <Brand size="sm" subtitle="Painel" />
          </div>
          <nav className="admin-nav" aria-label="Painel">
            <NavLink to="/admin" end className="admin-nav__link">
              <ListOrdered size={18} /> Pedidos
              {unseen > 0 && <span className="admin-nav__badge">{unseen}</span>}
            </NavLink>
            <NavLink to="/admin/cardapio" className="admin-nav__link">
              <LayoutGrid size={18} /> Cardápio
            </NavLink>
            <NavLink to="/admin/categorias" className="admin-nav__link">
              <Tags size={18} /> Categorias
            </NavLink>
            <a href={`${API_URL}/api/docs`} target="_blank" rel="noreferrer" className="admin-nav__link">
              <BookOpen size={18} /> API
            </a>
          </nav>
          <div className="admin-header__right">
            <span className={`live ${connected ? 'live--on' : ''}`} title={connected ? 'Recebendo pedidos em tempo real' : 'Sem conexão em tempo real'}>
              {connected ? 'Ao vivo' : 'Offline'}
            </span>
            <button type="button" className="icon-btn icon-btn--light" onClick={toggleSound} aria-label={soundOn ? 'Desativar som' : 'Ativar som'} title={soundOn ? 'Som ligado' : 'Som desligado'}>
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <span className="admin-user" title={admin?.email}>
              {admin?.name}
            </span>
            <button type="button" className="icon-btn icon-btn--light" onClick={() => logout()} aria-label="Sair" title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </AdminContext.Provider>
  );
}
