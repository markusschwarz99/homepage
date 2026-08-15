/**
 * API-Client für das Codewort-Spiel.
 * Public: aktive Wortpakete listen, 25 Wörter ziehen.
 * Admin: CRUD für Pakete und Wörter.
 */

import { api } from '../lib/api';
import type {
  CodewortPackPublic,
  CodewortPackAdmin,
  CodewortWord,
  CodewortDrawResponse,
} from '../types';

// ---------- Public ----------

export async function listCodewortPacks(): Promise<CodewortPackPublic[]> {
  return api<CodewortPackPublic[]>('/codewort/packs');
}

export async function drawCodewortWords(
  packId: number,
  exclude: string[] = [],
): Promise<CodewortDrawResponse> {
  return api<CodewortDrawResponse>('/codewort/draw', {
    method: 'POST',
    body: JSON.stringify({ pack_id: packId, exclude }),
  });
}

// ---------- Admin: Packs ----------

export async function adminListCodewortPacks(): Promise<CodewortPackAdmin[]> {
  return api<CodewortPackAdmin[]>('/codewort/admin/packs');
}

export async function adminCreateCodewortPack(payload: {
  name: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<CodewortPackAdmin> {
  return api<CodewortPackAdmin>('/codewort/admin/packs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateCodewortPack(
  id: number,
  payload: { name?: string; is_active?: boolean; sort_order?: number },
): Promise<CodewortPackAdmin> {
  return api<CodewortPackAdmin>(`/codewort/admin/packs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteCodewortPack(id: number): Promise<void> {
  return api<void>(`/codewort/admin/packs/${id}`, { method: 'DELETE' });
}

// ---------- Admin: Words ----------

export async function adminListCodewortWords(packId: number): Promise<CodewortWord[]> {
  return api<CodewortWord[]>(`/codewort/admin/packs/${packId}/words`);
}

export async function adminCreateCodewortWords(
  packId: number,
  words: string[],
): Promise<CodewortWord[]> {
  return api<CodewortWord[]>(`/codewort/admin/packs/${packId}/words`, {
    method: 'POST',
    body: JSON.stringify({ words }),
  });
}

export async function adminDeleteCodewortWord(wordId: number): Promise<void> {
  return api<void>(`/codewort/admin/words/${wordId}`, { method: 'DELETE' });
}
