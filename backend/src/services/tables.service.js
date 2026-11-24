import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

/**
 * QR codes "assinados" das mesas.
 *
 * Cada plaquinha leva o número da mesa e um código (token) calculado com uma chave secreta
 * que só o servidor conhece. Assim só quem leu a plaquinha oficial consegue fazer pedido,
 * e ninguém consegue inventar o QR de uma mesa ou trocar o número da mesa no link.
 */

const secret = () => config.tables.secret;

export const normalizeTable = (table) => String(table ?? '').trim().toUpperCase();

export function tableToken(table) {
  return createHmac('sha256', secret()).update(`mesa:${normalizeTable(table)}`).digest('base64url').slice(0, 16);
}

export function isValidTableToken(table, token) {
  if (typeof token !== 'string' || token.length !== 16) return false;
  const expected = Buffer.from(tableToken(table));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
