import { api } from '../lib/api';
import type {
  CVProfile,
  CVProfileInput,
  CVExperience,
  CVExperienceInput,
  CVLanguage,
  CVLanguageInput,
  CVCertificate,
  CVCertificateInput,
  CVEducation,
  CVEducationInput,
} from '../types';

export async function getCVProfile(): Promise<CVProfile | null> {
  return api<CVProfile | null>('/cv/profile');
}

export async function updateCVProfile(payload: CVProfileInput): Promise<CVProfile> {
  return api<CVProfile>('/cv/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function listCVExperiences(): Promise<CVExperience[]> {
  return api<CVExperience[]>('/cv/experiences');
}

export async function createCVExperience(payload: CVExperienceInput): Promise<CVExperience> {
  return api<CVExperience>('/cv/experiences', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCVExperience(id: number, payload: Partial<CVExperienceInput>): Promise<CVExperience> {
  return api<CVExperience>(`/cv/experiences/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteCVExperience(id: number): Promise<void> {
  return api<void>(`/cv/experiences/${id}`, { method: 'DELETE' });
}

export async function listCVLanguages(): Promise<CVLanguage[]> {
  return api<CVLanguage[]>('/cv/languages');
}

export async function createCVLanguage(payload: CVLanguageInput): Promise<CVLanguage> {
  return api<CVLanguage>('/cv/languages', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCVLanguage(id: number, payload: Partial<CVLanguageInput>): Promise<CVLanguage> {
  return api<CVLanguage>(`/cv/languages/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteCVLanguage(id: number): Promise<void> {
  return api<void>(`/cv/languages/${id}`, { method: 'DELETE' });
}

export async function listCVCertificates(): Promise<CVCertificate[]> {
  return api<CVCertificate[]>('/cv/certificates');
}

export async function createCVCertificate(payload: CVCertificateInput): Promise<CVCertificate> {
  return api<CVCertificate>('/cv/certificates', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCVCertificate(id: number, payload: Partial<CVCertificateInput>): Promise<CVCertificate> {
  return api<CVCertificate>(`/cv/certificates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteCVCertificate(id: number): Promise<void> {
  return api<void>(`/cv/certificates/${id}`, { method: 'DELETE' });
}

export async function listCVEducations(): Promise<CVEducation[]> {
  return api<CVEducation[]>('/cv/educations');
}

export async function createCVEducation(payload: CVEducationInput): Promise<CVEducation> {
  return api<CVEducation>('/cv/educations', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCVEducation(id: number, payload: Partial<CVEducationInput>): Promise<CVEducation> {
  return api<CVEducation>(`/cv/educations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteCVEducation(id: number): Promise<void> {
  return api<void>(`/cv/educations/${id}`, { method: 'DELETE' });
}
