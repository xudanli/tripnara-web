/** 私密愿望单 API 类型 — Swagger tag: trip-wishes */

export type WishCategory =
  | 'destination_route'
  | 'main_transport'
  | 'accommodation'
  | 'activities'
  | 'dining'
  | 'local_transport'
  | 'shopping'
  | 'insurance_visa';

export interface WishCategoryOption {
  value: WishCategory;
  label: string;
}

export interface WishCategoriesResponse {
  categories: WishCategoryOption[];
}

export type WishVisibility = 'private' | 'anonymous' | 'signed';

export type WishInputMode =
  | 'free_text'
  | 'card_select'
  | 'voice'
  | 'inspiration'
  | 'ai_convert';

export type WishStatus = 'active' | 'archived';

export interface WishSourceRef {
  cardId?: string;
  inspirationAssetId?: string;
  voiceTranscriptId?: string;
  aiMessageId?: string;
  assistantSessionId?: string;
}

export interface WishStructuredHints {
  must_do?: string[];
  must_avoid?: string[];
  soft_constraints?: Array<{
    type: string;
    category?: string;
    amount?: number;
    currency?: string;
    note?: string;
  }>;
  tags?: string[];
  pace?: string;
}

export interface TripWishItem {
  id: string;
  tripId: string;
  userId: string;
  category: WishCategory;
  text: string;
  importance: number;
  inputMode: WishInputMode;
  sourceRef: WishSourceRef | null;
  visibility: WishVisibility;
  agentEligible: boolean;
  structuredHints: WishStructuredHints | null;
  status: WishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWishItem {
  id: string;
  category: WishCategory;
  categoryLabel: string;
  text: string;
  importance: number;
  visibility: 'anonymous' | 'signed';
  authorDisplayName?: string;
  createdAt: string;
}

export interface WishSuggestionCard {
  id: string;
  category: WishCategory;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  defaultImportance: number;
  defaultText: string;
  structuredHints?: WishStructuredHints;
}

export interface InspirationAsset {
  id: string;
  region: string;
  tags: string[];
  imageUrl: string;
  caption: string;
  relatedPoiIds?: string[];
  seasonHint?: string;
}

export interface DayWishImpact {
  dayIndex: number;
  impactCount: number;
  wishIds: string[];
}

export interface WishSummary {
  privateCount: number;
  mineCount: number;
  teamCount: number;
  agentEligibleCount: number;
  impactByDay: DayWishImpact[];
}

export interface WishListResponse {
  items: TripWishItem[];
  count: number;
}

export interface TeamWishListResponse {
  items: TeamWishItem[];
  count: number;
}

export interface WishSuggestionCardsResponse {
  cards: WishSuggestionCard[];
}

export interface InspirationListResponse {
  items: InspirationAsset[];
  total: number;
}

export interface DayWishImpactResponse {
  impactByDay: DayWishImpact[];
}

export interface CreateWishRequest {
  category: WishCategory;
  text: string;
  importance?: number;
  inputMode: WishInputMode;
  visibility?: WishVisibility;
  agentEligible?: boolean;
}

export interface CreateWishFromCardRequest {
  text?: string;
  importance?: number;
  visibility?: WishVisibility;
}

export interface CreateWishFromInspirationRequest {
  inspirationAssetId: string;
  visibility?: WishVisibility;
  importance?: number;
  textOverride?: string;
}

export interface VoiceTranscribeResponse {
  voiceTranscriptId: string;
  transcript: string;
  language: string;
  confidence: number;
  suggestedDraft: {
    text: string;
    category: WishCategory;
    importance: number;
    structuredHints?: WishStructuredHints;
  };
}

export interface CreateWishFromVoiceRequest {
  voiceTranscriptId: string;
  text: string;
  category?: WishCategory;
  importance?: number;
  visibility?: WishVisibility;
}

export interface VoiceOneShotResponse {
  transcribe: VoiceTranscribeResponse;
  wish: TripWishItem;
}

export interface UpdateWishRequest {
  text?: string;
  category?: WishCategory;
  importance?: number;
  visibility?: WishVisibility;
  agentEligible?: boolean;
}

export interface ArchiveWishResponse {
  archived: boolean;
  wishId: string;
}

export interface InspirationQuery {
  region?: string;
  tag?: string;
  offset?: number;
  limit?: number;
}
