import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.js';
import { ALLOWED_MIME_TYPES, storage } from '../services/storage.js';
import { HttpError } from '../utils/http-error.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(HttpError.badRequest('Formato não suportado. Envie JPG, PNG ou WEBP.'));
    }
    cb(null, true);
  },
});

// Confere a assinatura do arquivo (não confia só no Content-Type enviado)
function looksLikeImage(buffer, mimeType) {
  const hex = buffer.subarray(0, 12).toString('hex');
  if (mimeType === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mimeType === 'image/png') return hex.startsWith('89504e47');
  if (mimeType === 'image/webp') return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250';
  return false;
}

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) throw HttpError.badRequest('Envie a imagem no campo "image"');
  if (!looksLikeImage(req.file.buffer, req.file.mimetype)) {
    throw HttpError.badRequest('O arquivo enviado não é uma imagem válida');
  }

  const { url, key } = await storage.save(req.file.buffer, req.file.mimetype);
  res.status(201).json({ url, key, size: req.file.size, mimeType: req.file.mimetype });
});

export default router;
