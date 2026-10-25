/** React Query keys for overall readiness */
export const overallReadinessKeys = {
  all: ['overall-readiness'] as const,
  trip: (tripId: string) => [...overallReadinessKeys.all, tripId] as const,
  card: (tripId: string) => [...overallReadinessKeys.trip(tripId), 'card'] as const,
  report: (tripId: string) => [...overallReadinessKeys.trip(tripId), 'report'] as const,
};
