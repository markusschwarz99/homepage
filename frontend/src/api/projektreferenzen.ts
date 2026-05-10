import { api } from '../lib/api';
import type { ProjectReference, ProjectReferenceInput } from '../types';

export async function adminListProjektreferenzen(): Promise<ProjectReference[]> {
  return api<ProjectReference[]>('/projektreferenzen/');
}

export async function adminCreateProjektreferenz(
  payload: ProjectReferenceInput,
): Promise<ProjectReference> {
  return api<ProjectReference>('/projektreferenzen/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateProjektreferenz(
  id: number,
  payload: Partial<ProjectReferenceInput>,
): Promise<ProjectReference> {
  return api<ProjectReference>(`/projektreferenzen/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteProjektreferenz(id: number): Promise<void> {
  return api<void>(`/projektreferenzen/${id}`, { method: 'DELETE' });
}
