import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool.js';
import { requireAuth, signToken } from '../middlewares/auth.js';
import { disconnectAdminSockets } from '../realtime/socket.js';
import { validate } from '../middlewares/validate.js';
import { loginBody, passwordBody } from '../schemas.js';
import { HttpError } from '../utils/http-error.js';

const router = Router();

// Limita tentativas de login por IP para dificultar ataques de força bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
    }),
});

router.post('/login', loginLimiter, validate(loginBody), async (req, res) => {
  const { email, password } = req.valid.body;
  const { rows } = await query('SELECT * FROM admins WHERE email = $1', [email]);
  const admin = rows[0];

  // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
  const ok = admin && (await bcrypt.compare(password, admin.password_hash));
  if (!ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos');
  }

  const token = signToken(admin);
  res.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
});

// Troca a senha do admin logado. As sessões abertas em outros aparelhos são encerradas.
router.post('/password', requireAuth, loginLimiter, validate(passwordBody), async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const { rows } = await query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Senha atual incorreta', [{ field: 'currentPassword', message: 'Senha atual incorreta' }]);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  // Arredonda para o segundo seguinte: o token novo (emitido agora) continua válido e os antigos caem
  await query("UPDATE admins SET password_hash = $1, password_changed_at = date_trunc('second', now()) WHERE id = $2", [hash, admin.id]);
  disconnectAdminSockets(admin.id);
  res.json({ token: signToken(admin), admin: { id: admin.id, name: admin.name, email: admin.email } });
});

router.get('/me', requireAuth, (req, res) => {
  const { id, name, email, exp } = req.admin;
  res.json({ admin: { id, name, email }, expiresAt: new Date(exp * 1000).toISOString() });
});

export default router;
