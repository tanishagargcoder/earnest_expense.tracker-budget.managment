import { pool } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';
import type { CategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export interface Category {
  id: string;
  name: string;
  color: string;
  expenseCount: number;
}

export async function list(userId: string): Promise<Category[]> {
  const { rows } = await pool.query<Category>(
    `SELECT c.id, c.name, c.color,
            (SELECT COUNT(*) FROM expenses e WHERE e.category_id = c.id) AS "expenseCount"
     FROM categories c
     WHERE c.user_id = $1
     ORDER BY lower(c.name)`,
    [userId],
  );
  return rows;
}

export async function create(userId: string, input: CategoryInput): Promise<Category> {
  const { rows } = await pool.query<Category>(
    `INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3)
     RETURNING id, name, color, 0 AS "expenseCount"`,
    [userId, input.name, input.color],
  );
  return rows[0];
}

export async function update(userId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
  const { rows } = await pool.query<Category>(
    `UPDATE categories c
     SET name = COALESCE($3, c.name), color = COALESCE($4, c.color)
     WHERE c.id = $1 AND c.user_id = $2
     RETURNING c.id, c.name, c.color,
               (SELECT COUNT(*) FROM expenses e WHERE e.category_id = c.id) AS "expenseCount"`,
    [id, userId, input.name ?? null, input.color ?? null],
  );
  if (!rows[0]) throw AppError.notFound('Category');
  return rows[0];
}

export async function remove(userId: string, id: string): Promise<void> {
  // The expenses FK is ON DELETE RESTRICT, so this fails (409) while expenses exist.
  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rowCount) throw AppError.notFound('Category');
}
