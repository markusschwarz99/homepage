import { APIRequestContext, request } from '@playwright/test';

/**
 * Ruft den Test-Only-Cleanup-Endpoint im Backend auf.
 * Backend hängt im Test-Setup auf Port 8001.
 */
const API_URL = process.env.API_URL || 'http://localhost:8001';

export async function cleanupRecipes(ctx?: APIRequestContext) {
  const apiContext = ctx ?? (await request.newContext());
  const res = await apiContext.post(`${API_URL}/test/cleanup/recipes`);
  if (!res.ok()) {
    throw new Error(
      `Cleanup fehlgeschlagen: ${res.status()} ${await res.text()}`
    );
  }
}

export async function cleanupTags(ctx?: APIRequestContext) {
  const apiContext = ctx ?? (await request.newContext());
  const res = await apiContext.post(`${API_URL}/test/cleanup/tags`);
  if (!res.ok()) {
    throw new Error(
      `Cleanup fehlgeschlagen: ${res.status()} ${await res.text()}`
    );
  }
}

export async function cleanupAll(ctx?: APIRequestContext) {
  const apiContext = ctx ?? (await request.newContext());
  const res = await apiContext.post(`${API_URL}/test/cleanup/all`);
  if (!res.ok()) {
    throw new Error(
      `Cleanup fehlgeschlagen: ${res.status()} ${await res.text()}`
    );
  }
}
