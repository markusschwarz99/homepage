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
  ImpostorRoom,
  ImpostorRoomJoin,
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

// ---------- Online-Modus ----------
// Eigener fetch statt api(): Wir brauchen den HTTP-Status (404 = Raum weg,
// 403 = nicht mehr im Raum) und schicken das Spieler-Token als eigenen Header.

const API_URL = import.meta.env.VITE_API_URL;

export class ImpostorRoomError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function roomRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Player-Token'] = token;
  const res = await fetch(`${API_URL}/impostor/rooms${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Fehler' }));
    const detail = typeof body.detail === 'string' ? body.detail : 'Ungültige Eingabe';
    throw new ImpostorRoomError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createImpostorRoom(name: string): Promise<ImpostorRoomJoin> {
  return roomRequest('', null, { method: 'POST', body: JSON.stringify({ name }) });
}

export function joinImpostorRoom(code: string, name: string): Promise<ImpostorRoomJoin> {
  return roomRequest(`/${code}/join`, null, { method: 'POST', body: JSON.stringify({ name }) });
}

export function getImpostorRoom(code: string, token: string): Promise<ImpostorRoom> {
  return roomRequest(`/${code}`, token);
}

export function updateImpostorRoomSettings(
  code: string,
  token: string,
  payload: { category_ids?: number[]; show_category_to_impostor?: boolean },
): Promise<ImpostorRoom> {
  return roomRequest(`/${code}/settings`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeImpostorRoomPlayer(
  code: string,
  token: string,
  playerId: number,
): Promise<void> {
  return roomRequest(`/${code}/players/${playerId}`, token, { method: 'DELETE' });
}

export function impostorRoomAction(
  code: string,
  token: string,
  action: 'start' | 'voting' | 'finish' | 'resolve' | 'lobby',
): Promise<ImpostorRoom> {
  return roomRequest(`/${code}/${action}`, token, { method: 'POST' });
}

export function voteImpostorRoom(
  code: string,
  token: string,
  targetId: number,
): Promise<ImpostorRoom> {
  return roomRequest(`/${code}/vote`, token, {
    method: 'POST',
    body: JSON.stringify({ target_id: targetId }),
  });
}
