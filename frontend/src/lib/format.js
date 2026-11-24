const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const formatPrice = (value) => money.format(Number(value) || 0);
export const formatTime = (iso) => time.format(new Date(iso));
export const formatDateTime = (iso) => dateTime.format(new Date(iso));

export function timeAgo(iso, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return formatDateTime(iso);
}

export const STATUS = [
  { id: 'recebido', label: 'Recebido', action: 'Iniciar preparo' },
  { id: 'em_preparo', label: 'Em preparo', action: 'Marcar como pronto' },
  { id: 'pronto', label: 'Pronto', action: 'Marcar como entregue' },
  { id: 'entregue', label: 'Entregue', action: null },
];

// Todos os status, incluindo "cancelado" (fora do fluxo normal)
export const ALL_STATUS = [...STATUS, { id: 'cancelado', label: 'Cancelado', action: null }];

export const isClosed = (id) => id === 'entregue' || id === 'cancelado';

export const statusLabel = (id) => ALL_STATUS.find((s) => s.id === id)?.label ?? id;

export function nextStatus(id) {
  const index = STATUS.findIndex((s) => s.id === id);
  if (index < 0) return null;
  return STATUS[index + 1]?.id ?? null;
}

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
