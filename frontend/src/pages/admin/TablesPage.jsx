import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, QrCode, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { load, save } from '../../lib/storage.js';

const KEY = 'barzinho:mesas';
const pad = (t) => (/^\d$/.test(t) ? `0${t}` : t);

function parseTables(count, extras) {
  const list = [];
  const n = Math.min(Math.max(Number(count) || 0, 0), 150);
  for (let i = 1; i <= n; i += 1) list.push(String(i));
  extras
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((x) => list.push(x.slice(0, 10)));
  return list;
}

/**
 * Plaquinhas das mesas com QR code assinado.
 * O código (t=...) é gerado pelo servidor com uma chave secreta; só essas plaquinhas permitem fazer pedido.
 */
export default function TablesPage() {
  const toast = useToast();
  const saved = load(KEY, { count: 12, extras: '' });
  const [count, setCount] = useState(saved.count);
  const [extras, setExtras] = useState(saved.extras);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const tables = parseTables(count, extras);
    if (!tables.length) return toast.show('Informe a quantidade de mesas', { type: 'error' });
    save(KEY, { count, extras });
    setLoading(true);
    try {
      const data = await api('/api/tables/qrcodes', { method: 'POST', auth: true, body: { tables } });
      const origin = window.location.origin;
      const result = await Promise.all(
        data.tables.map(async ({ table, token }) => {
          const url = `${origin}/?mesa=${encodeURIComponent(table)}&t=${token}`;
          const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
          return { table, url, svg };
        }),
      );
      setCards(result);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-page tables-page">
      <div className="admin-page__head no-print">
        <div>
          <h1>Mesas e QR codes</h1>
          <p className="muted">Plaquinhas para imprimir. Cada QR code é assinado: só com ele dá para fazer pedido daquela mesa.</p>
        </div>
        <div className="admin-page__tools">
          <button type="button" className="btn btn--primary" onClick={() => window.print()} disabled={!cards.length}>
            <Printer size={18} /> Imprimir plaquinhas
          </button>
        </div>
      </div>

      <div className="tables-form no-print">
        <label className="field">
          <span className="field__label">Quantidade de mesas</span>
          <input type="number" min={0} max={150} value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Outros lugares (opcional, separados por vírgula)</span>
          <input value={extras} onChange={(e) => setExtras(e.target.value)} placeholder="Ex.: Balcão, Varanda 1" maxLength={200} />
        </label>
        <button type="button" className="btn btn--ghost" onClick={generate} disabled={loading}>
          <QrCode size={18} /> {loading ? 'Gerando...' : 'Gerar plaquinhas'}
        </button>
      </div>

      <p className="form-info no-print">
        <ShieldCheck size={16} aria-hidden="true" /> Imprima em papel couché, colorido, tamanho real (4 por folha A4). Teste cada QR com o celular antes de
        colocar na mesa. Se uma plaquinha sumir, é só imprimir de novo a mesma mesa: o QR continua igual.
      </p>

      <div className="qr-sheet">
        {cards.map((c) => (
          <div className="qr-card" key={c.table}>
            <div className="qr-card__top">
              <img src="/favicon.svg" alt="" />
              <span>Barzinho CPN</span>
            </div>
            <div className="qr-card__mesa">
              {/^\d+$/.test(c.table) ? (
                <>
                  MESA <b>{pad(c.table)}</b>
                </>
              ) : (
                <b>{c.table.toUpperCase()}</b>
              )}
            </div>
            <div className="qr-card__qr" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="qr-card__cta">Aponte a câmera do celular</div>
            <div className="qr-card__sub">veja o cardápio e peça direto da mesa</div>
            <div className="qr-card__url">barcpn.tech</div>
          </div>
        ))}
      </div>
    </div>
  );
}
