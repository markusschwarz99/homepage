/**
 * API-Client für Improvements (Verbesserungsvorschläge).
 */

import { api } from '../lib/api';

export type ImprovementCategory = 'bug' | 'idee' | 'sonstiges';
export type ImprovementStatus = 'offen' | 'geplant' | 'erledigt' | 'abgelehnt';

export interface Improvement {
  id: number;
  title: string;
  category: ImprovementCategory;
  description: string;
  status: ImprovementStatus;
  created_at: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
}

export interface ImprovementCreate {
  title: string;
  category: ImprovementCategory;
  description: string;
}

export async function createImprovement(data: ImprovementCreate): Promise<Improvement> {
  return api<Improvement>('/improvements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listImprovements(): Promise<Improvement[]> {
  return api<Improvement[]>('/improvements');
}

export async function updateImprovementStatus(
  id: number,
  status: ImprovementStatus
): Promise<Improvement> {
  return api<Improvement>(`/improvements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteImprovement(id: number): Promise<void> {
  return api<void>(`/improvements/${id}`, { method: 'DELETE' });
}
