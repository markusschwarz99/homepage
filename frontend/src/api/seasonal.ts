/**
 * API-Client für den Saisonkalender.
 * Nutzt den existierenden api()-Helper aus lib/api.ts.
 */

import { api } from '../lib/api';
import type {
  SeasonalItem,
  SeasonalItemInput,
  SeasonalCategory,
  SeasonalAvailability,
} from '../types';

export async function listSeasonalItems(params?: {
  category?: SeasonalCategory;
  month?: number;
  type?: SeasonalAvailability;
}): Promise<SeasonalItem[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.month !== undefined) query.set('month', String(params.month));
  if (params?.type) query.set('type', params.type);
  const qs = query.toString();
  return api<SeasonalItem[]>(`/seasonal${qs ? '?' + qs : ''}`);
}

export async function listCurrentSeasonalItems(): Promise<SeasonalItem[]> {
  return api<SeasonalItem[]>('/seasonal/current');
}

export async function createSeasonalItem(payload: SeasonalItemInput): Promise<SeasonalItem> {
  return api<SeasonalItem>('/seasonal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSeasonalItem(
  id: number,
  payload: Partial<SeasonalItemInput>,
): Promise<SeasonalItem> {
  return api<SeasonalItem>(`/seasonal/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteSeasonalItem(id: number): Promise<void> {
  return api<void>(`/seasonal/${id}`, { method: 'DELETE' });
}
