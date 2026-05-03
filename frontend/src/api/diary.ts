/**
 * API-Client für Foto-Tagebuch (Admin-only).
 *
 * Bilder-URLs aus dem Backend sind relativ ("/uploads/diary/..."). Mit
 * imageUrl() wird VITE_API_URL davorgehängt, damit das Frontend sie laden kann.
 */
import { api, getToken } from '../lib/api';
import type { DiaryEntry, DiaryEntryInput, DiaryImage } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

/** Aus relativem Backend-Pfad (z.B. "/uploads/diary/abc.webp") absolute URL bauen. */
export function imageUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  return `${API_URL}${relativePath}`;
}

// ---------- Entries ----------

export async function listEntries(params?: {
  from?: string;
  to?: string;
}): Promise<DiaryEntry[]> {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const qs = search.toString();
  return api<DiaryEntry[]>(`/diary${qs ? `?${qs}` : ''}`);
}

export async function getEntry(id: number): Promise<DiaryEntry> {
  return api<DiaryEntry>(`/diary/${id}`);
}

export async function createEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
  return api<DiaryEntry>('/diary', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateEntry(
  id: number,
  input: Partial<DiaryEntryInput>,
): Promise<DiaryEntry> {
  return api<DiaryEntry>(`/diary/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteEntry(id: number): Promise<void> {
  await api<void>(`/diary/${id}`, { method: 'DELETE' });
}

// ---------- Images ----------

/**
 * Bild-Upload via Multipart. Der zentrale api()-Helper setzt
 * Content-Type: application/json hardcoded, das passt für Multipart nicht
 * (Browser muss die Boundary selbst setzen). Daher hier direkt fetch.
 */
export async function uploadImages(
  entryId: number,
  files: File[],
): Promise<DiaryImage[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/diary/${entryId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401 && token) {
    // gleiche Logik wie im api()-Helper
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session abgelaufen');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload fehlgeschlagen' }));
    throw new Error(error.detail || 'Upload fehlgeschlagen');
  }
  return response.json();
}

export async function updateImage(
  imageId: number,
  data: { caption?: string | null },
): Promise<DiaryImage> {
  return api<DiaryImage>(`/diary/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteImage(imageId: number): Promise<void> {
  await api<void>(`/diary/images/${imageId}`, { method: 'DELETE' });
}

export async function reorderImages(
  entryId: number,
  imageIds: number[],
): Promise<DiaryImage[]> {
  return api<DiaryImage[]>(`/diary/${entryId}/images/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ image_ids: imageIds }),
  });
}
