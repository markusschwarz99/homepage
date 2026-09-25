import type {
  CardRole,
  Clue,
  Team,
  TeamNames,
  TurnEndReason,
  TurnEntry,
  WinReason,
} from '../lib/codewort/types';

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

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  description: string | null;
  added_by: string;
  added_at: string;
}

export interface FrequentItem {
  name: string;
  count: number;
  last_quantity: string;
  last_description: string | null;
}

export interface HistoryItem {
  id: number;
  item_name: string;
  quantity: string;
  description: string | null;
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
  group_name?: string | null;
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
  comment_count: number;
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
  ingredients: { amount: number | null; unit: string; name: string; group_name: string | null }[];
  steps: { content: string }[];
  images: { url: string }[];
  tag_ids: number[];
}

// ---------- Saisonkalender ----------

export type SeasonalCategory = 'fruit' | 'vegetable';
export type SeasonalAvailability = 'regional' | 'storage';

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

// Online-Modus (jeder am eigenen Gerät, In-Memory-Räume im Backend)

export type ImpostorRoomPhase = 'lobby' | 'reveal' | 'voting' | 'result';

export interface ImpostorRoomJoin {
  code: string;
  player_id: number;
  token: string;
}

export interface ImpostorRoom {
  code: string;
  phase: ImpostorRoomPhase;
  round_number: number;
  me: number;
  host_id: number;
  players: { id: number; name: string }[];
  settings: { category_ids: number[]; show_category_to_impostor: boolean };
  min_players: number;
  max_players: number;
  role: { is_impostor: boolean; word: string | null; category_name: string | null } | null;
  starter_id: number | null;
  voted_ids: number[];
  my_vote: number | null;
  result: {
    impostor_id: number;
    word: string;
    category_name: string;
    votes: { voter_id: number; target_id: number }[];
    caught: boolean;
  } | null;
}

// ---------- Codewort-Spiel ----------

export interface CodewortPackPublic {
  id: number;
  name: string;
  word_count: number;
}

export interface CodewortPackAdmin {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  word_count: number;
  created_at: string;
}

export interface CodewortWord {
  id: number;
  word: string;
}

export interface CodewortDrawResponse {
  pack_id: number;
  pack_name: string;
  words: string[];
}

// Online-Modus (jeder am eigenen Gerät, In-Memory-Räume im Backend)

export type CodewortRoomPhase = 'lobby' | 'clue' | 'guessing' | 'ended';

export interface CodewortRoomJoin {
  code: string;
  player_id: number;
  token: string;
}

export interface CodewortRoomPlayer {
  id: number;
  name: string;
  team: Team | null;
  spymaster: boolean;
}

export interface CodewortRoomGame {
  /** `role` ist null, solange die Zugehörigkeit für diesen Spieler verborgen ist. */
  cards: { word: string; role: CardRole | null; revealed: boolean }[];
  start_team: Team;
  current_team: Team;
  clue: Clue | null;
  guesses_made: number;
  /** null = unbegrenzt */
  guesses_remaining: number | null;
  remaining: Record<Team, number>;
  history: TurnEntry[];
  winner: Team | null;
  win_reason: WinReason | null;
  last_reveal: {
    team: Team;
    word: string;
    role: CardRole;
    /** null = Team darf weiter raten */
    end_reason: TurnEndReason | null;
  } | null;
}

export interface CodewortRoom {
  code: string;
  phase: CodewortRoomPhase;
  round_number: number;
  me: number;
  host_id: number;
  players: CodewortRoomPlayer[];
  pack_id: number;
  pack_name: string;
  team_names: TeamNames;
  min_players: number;
  max_players: number;
  game: CodewortRoomGame | null;
}

export interface RecipeComment {
  id: number;
  recipe_id: number;
  user_id: number | null;
  user_name: string;
  content: string;
  parent_id: number | null;
  edited: boolean;
  created_at: string;
  updated_at: string;
  // Nur am Top-Level-Eintrag aus GET /recipes/{id}/comments gesetzt.
  // POST-Response liefert das Feld NICHT — daher optional.
  replies?: RecipeComment[];
}

// ---------- Notifications ----------

export type NotificationType = 'recipe_comment' | 'recipe_comment_reply';

export interface RecipeCommentNotificationPayload {
  recipe_id: number;
  recipe_title: string;
  comment_id: number;
  actor_id: number;
  actor_name: string;
}

export interface RecipeCommentReplyNotificationPayload {
  recipe_id: number;
  recipe_title: string;
  comment_id: number;
  parent_comment_id: number;
  actor_id: number;
  actor_name: string;
}

export type NotificationPayload =
  | RecipeCommentNotificationPayload
  | RecipeCommentReplyNotificationPayload;

export interface Notification {
  id: number;
  type: NotificationType;
  payload: NotificationPayload;
  read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}

// ---------- Projektreferenzen ----------

export interface ProjectReference {
  id: number;
  title: string;
  date_from: string;
  date_to: string | null;
  industry: string;
  contact: string;
  fte: number;
  topic: string;
  roles: string;
  responsibilities: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectReferenceInput {
  title: string;
  date_from: string;
  date_to: string | null;
  industry: string;
  contact: string;
  fte: number;
  topic: string;
  roles: string;
  responsibilities: string;
}

// ---------- CV ----------

export interface CVProfile {
  id: number;
  vorname: string | null;
  nachname: string | null;
  geburtsdatum: string | null;
}

export interface CVProfileInput {
  vorname?: string | null;
  nachname?: string | null;
  geburtsdatum?: string | null;
}

export interface CVExperience {
  id: number;
  date_from: string;
  date_to: string | null;
  rolle: string;
  beschreibung: string;
  sort_order: number;
}

export interface CVExperienceInput {
  date_from: string;
  date_to: string | null;
  rolle: string;
  beschreibung: string;
  sort_order: number;
}

export interface CVLanguage {
  id: number;
  sprache: string;
  niveau: string;
  sort_order: number;
}

export interface CVLanguageInput {
  sprache: string;
  niveau: string;
  sort_order: number;
}

export interface CVCertificate {
  id: number;
  name: string;
  jahr: number;
  sort_order: number;
}

export interface CVCertificateInput {
  name: string;
  jahr: number;
  sort_order: number;
}

export interface CVEducation {
  id: number;
  date_from: string;
  date_to: string | null;
  beschreibung: string;
  sort_order: number;
}

export interface CVEducationInput {
  date_from: string;
  date_to: string | null;
  beschreibung: string;
  sort_order: number;
}
