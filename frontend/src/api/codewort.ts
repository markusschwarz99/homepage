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
  CodewortRoom,
  CodewortRoomJoin,
} from '../types';
import type { Team } from '../lib/codewort/types';

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

// ---------- Online-Modus ----------
// Eigener fetch statt api(): Wir brauchen den HTTP-Status (404 = Raum weg,
// 403 = nicht mehr im Raum) und schicken das Spieler-Token als eigenen Header.

const API_URL = import.meta.env.VITE_API_URL;

export class CodewortRoomError extends Error {
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
  const res = await fetch(`${API_URL}/codewort/rooms${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Fehler' }));
    const detail = typeof body.detail === 'string' ? body.detail : 'Ungültige Eingabe';
    throw new CodewortRoomError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createCodewortRoom(name: string): Promise<CodewortRoomJoin> {
  return roomRequest('', null, { method: 'POST', body: JSON.stringify({ name }) });
}

export function joinCodewortRoom(code: string, name: string): Promise<CodewortRoomJoin> {
  return roomRequest(`/${code}/join`, null, { method: 'POST', body: JSON.stringify({ name }) });
}

export function getCodewortRoom(code: string, token: string): Promise<CodewortRoom> {
  return roomRequest(`/${code}`, token);
}

export function updateCodewortRoomPack(
  code: string,
  token: string,
  packId: number,
): Promise<CodewortRoom> {
  return roomRequest(`/${code}/settings`, token, {
    method: 'PATCH',
    body: JSON.stringify({ pack_id: packId }),
  });
}

export function chooseCodewortTeam(
  code: string,
  token: string,
  team: Team,
  spymaster: boolean,
): Promise<CodewortRoom> {
  return roomRequest(`/${code}/team`, token, {
    method: 'POST',
    body: JSON.stringify({ team, spymaster }),
  });
}

export function removeCodewortRoomPlayer(
  code: string,
  token: string,
  playerId: number,
): Promise<void> {
  return roomRequest(`/${code}/players/${playerId}`, token, { method: 'DELETE' });
}

export function codewortRoomAction(
  code: string,
  token: string,
  action: 'start' | 'end-turn' | 'lobby',
): Promise<CodewortRoom> {
  return roomRequest(`/${code}/${action}`, token, { method: 'POST' });
}

export function giveCodewortClue(
  code: string,
  token: string,
  word: string,
  count: number,
): Promise<CodewortRoom> {
  return roomRequest(`/${code}/clue`, token, {
    method: 'POST',
    body: JSON.stringify({ word, count }),
  });
}

export function revealCodewortCard(
  code: string,
  token: string,
  index: number,
): Promise<CodewortRoom> {
  return roomRequest(`/${code}/reveal`, token, {
    method: 'POST',
    body: JSON.stringify({ index }),
  });
}
