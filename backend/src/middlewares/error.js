import multer from 'multer';
import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(req, _res, next) {
  next(HttpError.notFound(`Rota ${req.method} ${req.originalUrl} não existe`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 5 MB' : 'Falha no envio do arquivo';
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
  }

  // JSON mal formatado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido no corpo da requisição' } });
  }

  // Violação de chave estrangeira / unique do Postgres
  if (err.code === '23503') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Registro relacionado não encontrado ou em uso' } });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Já existe um registro com esses dados' } });
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } });
}
