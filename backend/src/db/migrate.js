import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './pool.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = await readFile(path.join(dir, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

// Permite rodar direto: npm run db:migrate
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => {
      console.log('Tabelas criadas/atualizadas com sucesso.');
      return pool.end();
    })
    .catch((err) => {
      console.error('Falha na migração:', err.message);
      process.exit(1);
    });
}
