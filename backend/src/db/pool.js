import pg from 'pg';
import { config } from '../config.js';

// NUMERIC volta como string no driver pg; convertemos para number (valores monetários pequenos)
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

// Executa uma função dentro de uma transação, garantindo COMMIT/ROLLBACK
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
