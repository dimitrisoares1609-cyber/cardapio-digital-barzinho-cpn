import { formatDateTime, formatPrice } from './format.js';
import { load, save } from './storage.js';

/**
 * Impressão dos pedidos na impressora térmica (cupom) do bar.
 *
 * Funciona com qualquer impressora instalada no Windows (Elgin, Bematech, Epson, Daruma...).
 * Para imprimir sem abrir a janela de impressão, o painel é aberto no Chrome com o atalho
 * "--kiosk-printing", que manda direto para a impressora padrão do computador.
 *
 * As configurações ficam salvas só neste computador (localStorage), assim apenas o
 * computador da impressora imprime, mesmo com o painel aberto em outros aparelhos.
 */

const KEY_SETTINGS = 'barzinho:impressora';
const KEY_PRINTED = 'barzinho:impressos';

export const PAPER_WIDTHS = [
  { id: 80, label: '80 mm' },
  { id: 58, label: '58 mm' },
];

export function getPrinterSettings() {
  return { auto: false, width: 80, copies: 1, enabledAt: null, ...load(KEY_SETTINGS, {}) };
}

export function savePrinterSettings(settings) {
  save(KEY_SETTINGS, settings);
}

export const wasPrinted = (id) => load(KEY_PRINTED, []).includes(id);

function markPrinted(id) {
  const list = load(KEY_PRINTED, []).filter((x) => x !== id);
  list.push(id);
  save(KEY_PRINTED, list.slice(-300));
}

const esc = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function receiptHtml(order, width, { reprint = false } = {}) {
  const content = width - (width >= 80 ? 8 : 6); // área útil (margem da cabeça de impressão)
  const big = width >= 80 ? 22 : 18;
  const items = order.items
    .map(
      (i) => `
      <div class="item">
        <div class="row"><b>${i.quantity}x ${esc(i.name)}</b><span>${formatPrice(i.subtotal)}</span></div>
        ${i.options.length ? `<div class="opt">${i.options.map((o) => `- ${esc(o.choice)}`).join('<br>')}</div>` : ''}
        ${i.notes ? `<div class="obs">OBS: ${esc(i.notes)}</div>` : ''}
      </div>`,
    )
    .join('');

  return `<!doctype html><html data-width="${width}"><head><meta charset="utf-8"><title>Pedido ${order.number}</title><style>
    @page { size: ${width}mm 200mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${width}mm; }
    #r { padding: 2mm ${(width - content) / 2}mm 6mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; line-height: 1.25; }
    .c { text-align: center; }
    .brand { font-size: 15px; font-weight: 700; letter-spacing: .5px; }
    .mesa { font-size: ${big + 8}px; font-weight: 900; margin: 1mm 0; }
    .num { font-size: ${big - 4}px; font-weight: 700; }
    .reprint { font-size: 11px; font-weight: 700; border: 1px solid #000; display: inline-block; padding: 0 2mm; margin-top: 1mm; }
    hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
    .item { margin-bottom: 1.6mm; }
    .row { display: flex; justify-content: space-between; gap: 2mm; }
    .row b { font-size: 14px; }
    .row span { white-space: nowrap; }
    .opt { padding-left: 4mm; font-size: 12px; }
    .obs { padding-left: 4mm; font-size: 13px; font-weight: 700; }
    .notes { font-size: 13px; font-weight: 700; border: 1px solid #000; padding: 1mm 1.5mm; }
    .total { font-size: 15px; font-weight: 700; }
    .small { font-size: 11px; }
  </style></head><body><div id="r">
    <div class="c brand">BARZINHO CPN</div>
    <div class="c mesa">MESA ${esc(order.tableNumber)}</div>
    <div class="c num">PEDIDO #${order.number}</div>
    ${reprint ? '<div class="c"><span class="reprint">REIMPRESSÃO</span></div>' : ''}
    <div class="c small">${esc(order.customerName)} · ${formatDateTime(order.createdAt)}</div>
    <hr>
    ${items}
    ${order.notes ? `<hr><div class="notes">OBS / LOCALIZAÇÃO: ${esc(order.notes)}</div>` : ''}
    <hr>
    <div class="row total"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>
    <div class="c small" style="margin-top:3mm">Pedido feito pelo cardápio digital</div>
  </div></body></html>`;
}

// Fila: um cupom por vez, para pedidos que chegam juntos não se atropelarem
let queue = Promise.resolve();

function printHtml(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    const done = () => {
      setTimeout(() => {
        frame.remove();
        resolve();
      }, 1500);
    };
    setTimeout(() => {
      try {
        // Ajusta o tamanho da "página" ao comprimento exato do cupom, para a impressora
        // não puxar papel em branco nem cortar o pedido no meio
        const heightMm = Math.ceil((doc.getElementById('r').getBoundingClientRect().height * 25.4) / 96) + 2;
        const width = doc.documentElement.dataset.width;
        const style = doc.createElement('style');
        style.textContent = `@page { size: ${width}mm ${heightMm}mm; margin: 0; }`;
        doc.head.appendChild(style);
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } finally {
        done();
      }
    }, 250);
  });
}

/** Imprime o cupom do pedido (respeita o número de vias configurado). */
export function printOrder(order, { reprint = false } = {}) {
  const { width, copies } = getPrinterSettings();
  markPrinted(order.id);
  const html = receiptHtml(order, width, { reprint });
  for (let i = 0; i < Math.max(1, copies); i += 1) {
    queue = queue.then(() => printHtml(html));
  }
  return queue;
}

/** Cupom de teste, para conferir a impressora. */
export function printTest() {
  const now = new Date().toISOString();
  return printOrder(
    {
      id: `teste-${now}`,
      number: 0,
      tableNumber: '00',
      customerName: 'Teste de impressão',
      createdAt: now,
      notes: 'Se este cupom saiu inteiro e legível, está tudo certo.',
      total: 12.5,
      items: [
        { quantity: 1, name: 'Item de teste', subtotal: 10, options: [{ choice: 'Opção exemplo' }], notes: 'sem gelo' },
        { quantity: 1, name: 'Outro item', subtotal: 2.5, options: [], notes: null },
      ],
    },
    { reprint: false },
  );
}
