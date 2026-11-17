import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http-error.js';

export function signToken(admin) {
  return jwt.sign({ sub: String(admin.id), name: admin.name, email: admin.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// Lê e valida o token. Retorna o admin ou null (usado também pelo Socket.IO)
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return { id: Number(payload.sub), name: payload.name, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

// Middleware: exige "Authorization: Bearer <token>" válido
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw HttpError.unauthorized('Token não informado');
  }

  const admin = verifyToken(token);
  if (!admin) {
    throw new HttpError(401, 'TOKEN_INVALID', 'Sessão expirada ou token inválido. Faça login novamente.');
  }

  req.admin = admin;
  next();
}
