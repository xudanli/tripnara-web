import { create } from 'zustand';
import type { HikingPhase } from '@/types/hiking-embedded';

interface TripEmbeddedSidebarState {
  subtitles: Record<
    string,
    { phase: HikingPhase; segmentCount: number; travelLabel?: string; phaseHintZh?: string }
  >;
  setSubtitle: (
    tripId: string,
    data: {
      phase: HikingPhase;
      segmentCount: number;
      travelLabel?: string;
      phaseHintZh?: string;
    }
  ) => void;
  clear: (tripId: string) => void;
}

export const useTripEmbeddedSidebarStore = create<TripEmbeddedSidebarState>((set) => ({
  subtitles: {},
  setSubtitle: (tripId, data) =>
    set((s) => ({
      subtitles: { ...s.subtitles, [tripId]: data },
    })),
  clear: (tripId) =>
    set((s) => {
      const next = { ...s.subtitles };
      delete next[tripId];
      return { subtitles: next };
    }),
}));
