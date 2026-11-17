import { io } from 'socket.io-client';
import { API_URL } from './api.js';

// Conexão pública (cliente): uma única instância compartilhada pelas telas do cardápio
let publicSocket;

export function getPublicSocket() {
  if (!publicSocket) {
    publicSocket = io(API_URL || undefined, { transports: ['websocket', 'polling'] });
  }
  return publicSocket;
}

// Conexão do painel: envia o JWT para entrar na sala dos administradores
export function createAdminSocket(token) {
  return io(API_URL || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
}
