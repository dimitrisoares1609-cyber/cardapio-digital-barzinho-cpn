import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, KeyRound, LayoutGrid, ListOrdered, LogOut, Printer, Tags, Volume2, VolumeX } from 'lucide-react';
import Brand from '../../components/Brand.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { API_URL, api } from '../../lib/api.js';
import { getPrinterSettings, printOrder, wasPrinted } from '../../lib/printer.js';
import PrinterSettingsModal from './PrinterSettingsModal.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
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
  const [printer, setPrinter] = useState(getPrinterSettings);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const soundRef = useRef(soundOn);
  const printerRef = useRef(printer);
  printerRef.current = printer;
  const onOrdersPage = location.pathname === '/admin';
  const onOrdersRef = useRef(onOrdersPage);

  soundRef.current = soundOn;
  onOrdersRef.current = onOrdersPage;

  useEffect(() => {
    const s = createAdminSocket(token);
    setSocket(s);
    // Impressão automática: só imprime pedidos que este computador ainda não imprimiu
    const autoPrint = (order) => {
      const cfg = printerRef.current;
      if (!cfg.auto || wasPrinted(order.id)) return;
      if (cfg.enabledAt && new Date(order.createdAt) < new Date(cfg.enabledAt)) return;
      printOrder(order);
    };
    // Ao (re)conectar, imprime pedidos recebidos nos últimos 20 min que ficaram para trás
    // (ex.: internet caiu ou o computador foi reiniciado)
    const catchUp = async () => {
      if (!printerRef.current.auto) return;
      try {
        const data = await api('/api/orders?period=today&status=recebido&limit=50', { auth: true });
        data.orders
          .filter((o) => o.status === 'recebido' && Date.now() - new Date(o.createdAt) < 20 * 60000)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .forEach(autoPrint);
      } catch {
        /* tenta de novo na próxima reconexão */
      }
    };
    s.on('connect', () => {
      setConnected(true);
      catchUp();
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));
    s.on('order:created', (order) => {
      if (soundRef.current) playNewOrderSound();
      toast.show(`Novo pedido #${order.number} · Mesa ${order.tableNumber}`, { type: 'info', duration: 6000 });
      autoPrint(order);
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

  const value = useMemo(() => ({ socket, connected, printer }), [socket, connected, printer]);

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
            <button
              type="button"
              className={`icon-btn icon-btn--light ${printer.auto ? 'icon-btn--active' : ''}`}
              onClick={() => setPrinterOpen(true)}
              aria-label="Impressora"
              title={printer.auto ? 'Impressão automática ligada' : 'Impressão automática desligada'}
            >
              <Printer size={20} />
            </button>
            <button type="button" className="icon-btn icon-btn--light" onClick={toggleSound} aria-label={soundOn ? 'Desativar som' : 'Ativar som'} title={soundOn ? 'Som ligado' : 'Som desligado'}>
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button type="button" className="icon-btn icon-btn--light" onClick={() => setPasswordOpen(true)} aria-label="Trocar senha" title="Trocar senha">
              <KeyRound size={20} />
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
        <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
        <PrinterSettingsModal open={printerOpen} onClose={() => setPrinterOpen(false)} settings={printer} onChange={setPrinter} />
      </div>
    </AdminContext.Provider>
  );
}
