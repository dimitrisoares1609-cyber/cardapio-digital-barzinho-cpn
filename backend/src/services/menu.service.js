import { query } from '../db/pool.js';
import { HttpError } from '../utils/http-error.js';

export function mapItem(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name ?? undefined,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    ingredients: row.ingredients,
    price: row.price,
    imageUrl: row.image_url,
    options: row.options ?? [],
    available: row.available,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    active: row.active,
    ...(row.item_count !== undefined ? { itemCount: row.item_count } : {}),
  };
}

const ITEM_SELECT = `
  SELECT m.*, c.name AS category_name
    FROM menu_items m
    JOIN categories c ON c.id = m.category_id`;

// Cardápio público: só categorias ativas e itens disponíveis
export async function getPublicMenu() {
  const [categories, items] = await Promise.all([
    query('SELECT * FROM categories WHERE active ORDER BY sort_order, name'),
    query(`${ITEM_SELECT} WHERE m.available AND c.active ORDER BY m.sort_order, m.name`),
  ]);

  const byCategory = new Map(categories.rows.map((c) => [c.id, { ...mapCategory(c), items: [] }]));
  for (const row of items.rows) {
    byCategory.get(row.category_id)?.items.push(mapItem(row));
  }
  return [...byCategory.values()].filter((c) => c.items.length > 0);
}

export async function listItems({ categoryId, search } = {}) {
  const where = [];
  const params = [];
  if (categoryId) {
    params.push(categoryId);
    where.push(`m.category_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(m.name ILIKE $${params.length} OR m.short_description ILIKE $${params.length})`);
  }
  const sql = `${ITEM_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY c.sort_order, m.sort_order, m.name`;
  const { rows } = await query(sql, params);
  return rows.map(mapItem);
}

export async function getItem(id) {
  const { rows } = await query(`${ITEM_SELECT} WHERE m.id = $1`, [id]);
  if (!rows[0]) throw HttpError.notFound('Item não encontrado');
  return mapItem(rows[0]);
}

async function ensureCategory(categoryId) {
  const { rowCount } = await query('SELECT 1 FROM categories WHERE id = $1', [categoryId]);
  if (!rowCount) throw HttpError.unprocessable('Categoria não encontrada', [{ field: 'categoryId', message: 'Categoria não encontrada' }]);
}

export async function createItem(data) {
  await ensureCategory(data.categoryId);
  const sortOrder =
    data.sortOrder ??
    (await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM menu_items WHERE category_id = $1', [data.categoryId]))
      .rows[0].next;

  const { rows } = await query(
    `INSERT INTO menu_items
       (category_id, name, short_description, description, ingredients, price, image_url, options, available, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      data.categoryId,
      data.name,
      data.shortDescription,
      data.description,
      data.ingredients,
      data.price,
      data.imageUrl,
      JSON.stringify(data.options),
      data.available,
      sortOrder,
    ],
  );
  return getItem(rows[0].id);
}

export async function updateItem(id, data) {
  const current = await getItem(id);
  await ensureCategory(data.categoryId);

  await query(
    `UPDATE menu_items
        SET category_id = $1, name = $2, short_description = $3, description = $4, ingredients = $5,
            price = $6, image_url = $7, options = $8, available = $9, sort_order = $10, updated_at = now()
      WHERE id = $11`,
    [
      data.categoryId,
      data.name,
      data.shortDescription,
      data.description,
      data.ingredients,
      data.price,
      data.imageUrl,
      JSON.stringify(data.options),
      data.available,
      data.sortOrder ?? current.sortOrder,
      id,
    ],
  );
  return { previous: current, item: await getItem(id) };
}

export async function setAvailability(id, available) {
  const item = await getItem(id);
  if (available && item.price <= 0) {
    throw HttpError.unprocessable('Defina um preço antes de deixar o item disponível', [
      { field: 'price', message: 'Item disponível precisa ter preço maior que zero' },
    ]);
  }
  await query('UPDATE menu_items SET available = $1, updated_at = now() WHERE id = $2', [available, id]);
  return getItem(id);
}

export async function deleteItem(id) {
  const item = await getItem(id);
  await query('DELETE FROM menu_items WHERE id = $1', [id]);
  return item;
}

// ---------- Categorias ----------

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listCategories() {
  const { rows } = await query(
    `SELECT c.*, COUNT(m.id)::int AS item_count
       FROM categories c
       LEFT JOIN menu_items m ON m.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name`,
  );
  return rows.map(mapCategory);
}

async function uniqueSlug(name, ignoreId) {
  const base = slugify(name) || 'categoria';
  let slug = base;
  for (let n = 2; ; n += 1) {
    const { rowCount } = await query('SELECT 1 FROM categories WHERE slug = $1 AND id <> $2', [slug, ignoreId ?? 0]);
    if (!rowCount) return slug;
    slug = `${base}-${n}`;
  }
}

export async function createCategory(data) {
  const sortOrder =
    data.sortOrder ?? (await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories')).rows[0].next;
  const { rows } = await query(
    'INSERT INTO categories (name, slug, sort_order, active) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.name, await uniqueSlug(data.name), sortOrder, data.active],
  );
  return mapCategory({ ...rows[0], item_count: 0 });
}

export async function updateCategory(id, data) {
  const { rows } = await query(
    `UPDATE categories
        SET name = $1, slug = $2, sort_order = COALESCE($3, sort_order), active = $4
      WHERE id = $5
      RETURNING *`,
    [data.name, await uniqueSlug(data.name, id), data.sortOrder ?? null, data.active, id],
  );
  if (!rows[0]) throw HttpError.notFound('Categoria não encontrada');
  return mapCategory(rows[0]);
}

export async function deleteCategory(id) {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM menu_items WHERE category_id = $1', [id]);
  if (rows[0].total > 0) {
    throw HttpError.conflict(`A categoria possui ${rows[0].total} item(ns). Mova ou remova os itens antes de excluir.`);
  }
  const result = await query('DELETE FROM categories WHERE id = $1', [id]);
  if (!result.rowCount) throw HttpError.notFound('Categoria não encontrada');
}
