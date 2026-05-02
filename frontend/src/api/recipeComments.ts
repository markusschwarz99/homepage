/**
 * API-Client für Rezept-Kommentare.
 * Nutzt den existierenden api()-Helper aus lib/api.ts.
 */
import { api } from '../lib/api';
import type { RecipeComment } from '../types';

export async function listComments(recipeId: number): Promise<RecipeComment[]> {
  return api<RecipeComment[]>(`/recipes/${recipeId}/comments`);
}

export async function createComment(
  recipeId: number,
  content: string,
): Promise<RecipeComment> {
  return api<RecipeComment>(`/recipes/${recipeId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function updateComment(
  recipeId: number,
  commentId: number,
  content: string,
): Promise<RecipeComment> {
  return api<RecipeComment>(`/recipes/${recipeId}/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function deleteComment(
  recipeId: number,
  commentId: number,
): Promise<void> {
  await api<void>(`/recipes/${recipeId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}
