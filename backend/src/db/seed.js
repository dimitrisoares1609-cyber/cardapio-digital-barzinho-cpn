import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { pool, withTransaction } from './pool.js';
import { categories, items } from './seed-data.js';

/**
 * Popula o banco com o administrador inicial e o cardápio do bar.
 * - O admin é criado só se o e-mail ainda não existir.
 * - O cardápio só é inserido se a tabela de itens estiver vazia
 *   (use "npm run db:seed -- --reset" para apagar e recriar o cardápio).
 */
export async function seed({ reset = false } = {}) {
  await withTransaction(async (db) => {
    const passwordHash = await bcrypt.hash(config.admin.password, 10);
    await db.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [config.admin.name, config.admin.email.toLowerCase(), passwordHash],
    );

    if (reset) {
      await db.query('DELETE FROM menu_items');
      await db.query('DELETE FROM categories');
    }

    const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM menu_items');
    if (rows[0].total > 0) {
      console.log('Cardápio já existe no banco, nada foi inserido.');
      return;
    }

    const categoryIds = {};
    for (const [index, category] of categories.entries()) {
      const result = await db.query(
        `INSERT INTO categories (name, slug, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [category.name, category.slug, index + 1],
      );
      categoryIds[category.slug] = result.rows[0].id;
    }

    const positionByCategory = {};
    for (const item of items) {
      positionByCategory[item.category] = (positionByCategory[item.category] || 0) + 1;
      await db.query(
        `INSERT INTO menu_items
           (category_id, name, short_description, description, ingredients, price, image_url, options, available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          categoryIds[item.category],
          item.name,
          item.shortDescription ?? null,
          item.description ?? null,
          item.ingredients ?? null,
          item.price,
          item.image ?? null,
          JSON.stringify(item.options ?? []),
          item.available ?? true,
          positionByCategory[item.category],
        ],
      );
    }

    console.log(`Cardápio inserido: ${categories.length} categorias e ${items.length} itens.`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed({ reset: process.argv.includes('--reset') })
    .then(() => {
      console.log(`Admin: ${config.admin.email}`);
      return pool.end();
    })
    .catch((err) => {
      console.error('Falha ao popular o banco:', err.message);
      process.exit(1);
    });
}
