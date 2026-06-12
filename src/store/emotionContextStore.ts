import { create } from 'zustand';
import type { EmotionalContextClient, ProactivityGate } from '@/types/emotional-context';
import type { SharedMilestoneUiCard } from '@/types/shared-milestone';
import type { VoicePayload } from '@/types/voice-payload';
import type { AccommodationHealthPayload } from '@/types/accommodation-health';

function deriveProactivityGate(ctx: EmotionalContextClient | null): ProactivityGate {
  const gate = ctx?.proactivityGate;
  if (gate === 'SILENT' || gate === 'GENTLE' || gate === 'ACTIVE' || gate === 'FULL') {
    return gate;
  }
  return 'FULL';
}

export interface EmotionContextStoreState {
  emotionalContext: EmotionalContextClient | null;
  voicePayload: VoicePayload | null;
  accommodationHealth: AccommodationHealthPayload | null;
  proactivityGate: ProactivityGate;
  sharedMilestoneCards: SharedMilestoneUiCard[];
  set: (ctx: EmotionalContextClient | null) => void;
  setVoicePayload: (voice: VoicePayload | null) => void;
  setAccommodationHealth: (health: AccommodationHealthPayload | null) => void;
  setMilestoneCards: (cards: SharedMilestoneUiCard[]) => void;
  reset: () => void;
}

const initialState = {
  emotionalContext: null as EmotionalContextClient | null,
  voicePayload: null as VoicePayload | null,
  accommodationHealth: null as AccommodationHealthPayload | null,
  proactivityGate: 'FULL' as ProactivityGate,
  sharedMilestoneCards: [] as SharedMilestoneUiCard[],
};

export const useEmotionContextStore = create<EmotionContextStoreState>((set) => ({
  ...initialState,
  set: (ctx) =>
    set({
      emotionalContext: ctx,
      proactivityGate: deriveProactivityGate(ctx),
    }),
  setVoicePayload: (voice) => set({ voicePayload: voice }),
  setAccommodationHealth: (health) => set({ accommodationHealth: health }),
  setMilestoneCards: (cards) => set({ sharedMilestoneCards: cards }),
  reset: () => set(initialState),
}));

/** 非 React 上下文（SSE / route_and_run 回调） */
export function getEmotionContextStoreState(): EmotionContextStoreState {
  return useEmotionContextStore.getState();
}
