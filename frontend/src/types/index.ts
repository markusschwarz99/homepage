export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin: boolean;
  is_household: boolean;
  is_member: boolean;
  avatar_url: string;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  added_by: string;
  added_at: string;
}

export interface FrequentItem {
  name: string;
  count: number;
  last_quantity: string;
}

export interface HistoryItem {
  id: number;
  item_name: string;
  quantity: string;
  purchased: boolean;
  user_name: string;
  purchased_at: string;
}

// ---------- Tags ----------

export interface Tag {
  id: number;
  name: string;
  position: number;
  category_id: number;
}

export interface TagCategory {
  id: number;
  name: string;
  position: number;
  tags: Tag[];
}

// Tag-Referenz innerhalb eines Rezepts (ohne position)
export interface RecipeTagRef {
  id: number;
  name: string;
  category_id: number;
}

// ---------- Rezepte ----------

export interface RecipeIngredient {
  id?: number;
  position?: number;
  amount: number | null;
  unit: string;
  name: string;
}

export interface RecipeStep {
  id?: number;
  position?: number;
  content: string;
}

export interface RecipeImage {
  id?: number;
  position?: number;
  url: string;
}

// Übersichts-Darstellung (Liste)
export interface RecipeSummary {
  id: number;
  title: string;
  servings: number;
  servings_unit: string;
  author_id: number;
  author_name: string;
  created_at: string;
  updated_at: string;
  cover_image: string | null;
  tags: RecipeTagRef[];
}

// Detail-Darstellung
export interface Recipe extends RecipeSummary {
  images: RecipeImage[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

// Payload beim Speichern
export interface RecipeInput {
  title: string;
  servings: number;
  servings_unit: string;
  ingredients: { amount: number | null; unit: string; name: string }[];
  steps: { content: string }[];
  images: { url: string }[];
  tag_ids: number[];
}

// ---------- Saisonkalender ----------

export type SeasonalCategory = 'fruit' | 'vegetable';
export type SeasonalAvailability = 'regional' | 'storage' | 'import';

export interface MonthAvailability {
  month: number; // 1..12
  types: SeasonalAvailability[]; // mind. 1, sortiert: regional, storage, import
}

export interface SeasonalItem {
  id: number;
  name: string;
  category: SeasonalCategory;
  availabilities: MonthAvailability[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeasonalItemInput {
  name: string;
  category: SeasonalCategory;
  availabilities: MonthAvailability[];
  notes?: string | null;
}

// ---------- Impostor-Spiel ----------

export interface ImpostorCategoryPublic {
  id: number;
  name: string;
  word_count: number;
}

export interface ImpostorCategoryAdmin {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  word_count: number;
  created_at: string;
}

export interface ImpostorWord {
  id: number;
  word: string;
}

export interface ImpostorRandomResponse {
  word: string;
  category_id: number;
  category_name: string;
}
