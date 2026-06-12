import { create } from 'zustand';
import type { EmotionalContextClient, ProactivityGate } from '@/types/emotional-context';
import type { SharedMilestoneUiCard } from '@/types/shared-milestone';

function deriveProactivityGate(ctx: EmotionalContextClient | null): ProactivityGate {
  const gate = ctx?.proactivityGate;
  if (gate === 'SILENT' || gate === 'GENTLE' || gate === 'ACTIVE' || gate === 'FULL') {
    return gate;
  }
  return 'FULL';
}

export interface EmotionContextStoreState {
  emotionalContext: EmotionalContextClient | null;
  proactivityGate: ProactivityGate;
  sharedMilestoneCards: SharedMilestoneUiCard[];
  set: (ctx: EmotionalContextClient | null) => void;
  setMilestoneCards: (cards: SharedMilestoneUiCard[]) => void;
  reset: () => void;
}

const initialState = {
  emotionalContext: null as EmotionalContextClient | null,
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
  setMilestoneCards: (cards) => set({ sharedMilestoneCards: cards }),
  reset: () => set(initialState),
}));

/** 非 React 上下文（SSE / route_and_run 回调） */
export function getEmotionContextStoreState(): EmotionContextStoreState {
  return useEmotionContextStore.getState();
}
