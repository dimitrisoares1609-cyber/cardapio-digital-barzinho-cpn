import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { tablesBody } from '../schemas.js';
import { normalizeTable, tableToken } from '../services/tables.service.js';

const router = Router();

// Painel: devolve o código assinado de cada mesa, para montar e imprimir as plaquinhas
router.post('/qrcodes', requireAuth, validate(tablesBody), (req, res) => {
  const seen = new Set();
  const tables = [];
  for (const raw of req.valid.body.tables) {
    const table = raw.trim();
    const key = normalizeTable(table);
    if (seen.has(key)) continue;
    seen.add(key);
    tables.push({ table, token: tableToken(table) });
  }
  res.json({ tables });
});

export default router;
