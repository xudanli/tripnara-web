import type {
  WishCategory,
  WishVisibility,
} from '@/types/trip-wishes';

export interface WishDraft {
  category: WishCategory;
  text: string;
  importance: 1 | 2 | 3 | 4 | 5;
  visibility: WishVisibility;
  cardId?: string;
  inspirationAssetId?: string;
  voiceTranscriptId?: string;
}
