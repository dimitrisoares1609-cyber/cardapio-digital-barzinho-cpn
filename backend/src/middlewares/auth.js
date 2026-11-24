import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { HttpError } from '../utils/http-error.js';

export function signToken(admin) {
  return jwt.sign({ sub: String(admin.id), name: admin.name, email: admin.email }, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
  });
}

// Confere só a assinatura e a validade do token (sem banco)
function decodeToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    return { id: Number(payload.sub), name: payload.name, email: payload.email, exp: payload.exp, iat: payload.iat };
  } catch {
    return null;
  }
}

/**
 * Valida o token e confere no banco se o admin ainda existe e se a senha não foi trocada
 * depois que o token foi emitido (trocar a senha desconecta os outros aparelhos).
 * Retorna o admin ou null. Usado pelas rotas e pelo Socket.IO.
 */
export async function verifyToken(token) {
  const admin = decodeToken(token);
  if (!admin) return null;
  const { rows } = await query('SELECT password_changed_at FROM admins WHERE id = $1', [admin.id]);
  if (!rows[0]) return null;
  const changedAtSec = Math.floor(new Date(rows[0].password_changed_at).getTime() / 1000);
  if (admin.iat < changedAtSec) return null;
  return admin;
}

// Middleware: exige "Authorization: Bearer <token>" válido
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw HttpError.unauthorized('Token não informado');
  }

  const admin = await verifyToken(token);
  if (!admin) {
    throw new HttpError(401, 'TOKEN_INVALID', 'Sessão expirada ou token inválido. Faça login novamente.');
  }

  req.admin = admin;
  next();
}
