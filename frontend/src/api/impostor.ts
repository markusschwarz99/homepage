/**
 * API-Client für das Impostor-Spiel.
 * Public-Endpoints: list aktive Kategorien, hole zufälliges Wort.
 * Admin-Endpoints: CRUD für Kategorien und Wörter.
 */

import { api } from '../lib/api';
import type {
  ImpostorCategoryPublic,
  ImpostorCategoryAdmin,
  ImpostorWord,
  ImpostorRandomResponse,
} from '../types';

// ---------- Public ----------

export async function listImpostorCategories(): Promise<ImpostorCategoryPublic[]> {
  return api<ImpostorCategoryPublic[]>('/impostor/categories');
}

export async function getImpostorRandomWord(
  categoryIds: number[],
): Promise<ImpostorRandomResponse> {
  return api<ImpostorRandomResponse>('/impostor/random', {
    method: 'POST',
    body: JSON.stringify({ category_ids: categoryIds }),
  });
}

// ---------- Admin: Categories ----------

export async function adminListImpostorCategories(): Promise<ImpostorCategoryAdmin[]> {
  return api<ImpostorCategoryAdmin[]>('/impostor/admin/categories');
}

export async function adminCreateImpostorCategory(payload: {
  name: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<ImpostorCategoryAdmin> {
  return api<ImpostorCategoryAdmin>('/impostor/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateImpostorCategory(
  id: number,
  payload: { name?: string; is_active?: boolean; sort_order?: number },
): Promise<ImpostorCategoryAdmin> {
  return api<ImpostorCategoryAdmin>(`/impostor/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteImpostorCategory(id: number): Promise<void> {
  return api<void>(`/impostor/admin/categories/${id}`, { method: 'DELETE' });
}

// ---------- Admin: Words ----------

export async function adminListImpostorWords(categoryId: number): Promise<ImpostorWord[]> {
  return api<ImpostorWord[]>(`/impostor/admin/categories/${categoryId}/words`);
}

export async function adminCreateImpostorWords(
  categoryId: number,
  words: string[],
): Promise<ImpostorWord[]> {
  return api<ImpostorWord[]>(`/impostor/admin/categories/${categoryId}/words`, {
    method: 'POST',
    body: JSON.stringify({ words }),
  });
}

export async function adminDeleteImpostorWord(wordId: number): Promise<void> {
  return api<void>(`/impostor/admin/words/${wordId}`, { method: 'DELETE' });
}
