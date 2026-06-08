import { create } from 'zustand';

export type TripDsoVersionState = {
  /** tripId → 最近一次成功编排响应中的 dso_version */
  byTripId: Record<string, string>;
  setServerDsoVersion: (tripId: string, version: string | null | undefined) => void;
  getServerDsoVersion: (tripId: string | null | undefined) => string | undefined;
  clearTrip: (tripId: string) => void;
  reset: () => void;
};

export const useTripDsoVersionStore = create<TripDsoVersionState>((set, get) => ({
  byTripId: {},
  setServerDsoVersion: (tripId, version) => {
    const id = tripId?.trim();
    if (!id) return;
    const v = version?.trim();
    if (!v) return;
    set((s) => ({
      byTripId: { ...s.byTripId, [id]: v },
    }));
  },
  getServerDsoVersion: (tripId) => {
    const id = tripId?.trim();
    if (!id) return undefined;
    return get().byTripId[id];
  },
  clearTrip: (tripId) => {
    const id = tripId?.trim();
    if (!id) return;
    set((s) => {
      const next = { ...s.byTripId };
      delete next[id];
      return { byTripId: next };
    });
  },
  reset: () => set({ byTripId: {} }),
}));
