import Modal from '../../components/Modal.jsx';
import Switch from '../../components/Switch.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PAPER_WIDTHS, printTest, savePrinterSettings } from '../../lib/printer.js';

/** Configuração da impressora de pedidos (vale só para este computador). */
export default function PrinterSettingsModal({ open, onClose, settings, onChange }) {
  const toast = useToast();

  const update = (patch) => {
    const next = { ...settings, ...patch };
    if (patch.auto === true) next.enabledAt = new Date().toISOString();
    savePrinterSettings(next);
    onChange(next);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Impressora de pedidos"
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              printTest();
              toast.show('Cupom de teste enviado para a impressora');
            }}
          >
            Imprimir teste
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Pronto
          </button>
        </>
      }
    >
      <div className="printer-settings">
        <Switch checked={settings.auto} onChange={(auto) => update({ auto })} label="Imprimir cada pedido novo automaticamente" />
        <p className="muted small">
          Ligue só no computador que está conectado à impressora. Pedidos perdidos nos últimos 20 minutos (internet caiu, computador
          reiniciou) são impressos quando a conexão volta.
        </p>

        <div className="printer-settings__row">
          <label className="field">
            <span className="field__label">Largura do papel</span>
            <select className="input" value={settings.width} onChange={(e) => update({ width: Number(e.target.value) })}>
              {PAPER_WIDTHS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Vias por pedido</span>
            <select className="input" value={settings.copies} onChange={(e) => update({ copies: Number(e.target.value) })}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <details className="printer-settings__help">
          <summary>Como imprimir sem aparecer a janela de impressão</summary>
          <ol>
            <li>Deixe a impressora térmica como <b>impressora padrão</b> do Windows.</li>
            <li>
              Crie um atalho do Chrome na área de trabalho e, em <i>Propriedades → Destino</i>, acrescente no final:{' '}
              <code>--kiosk-printing</code>
            </li>
            <li>Abra o painel sempre por esse atalho e ligue a impressão automática acima.</li>
          </ol>
        </details>
      </div>
    </Modal>
  );
}
