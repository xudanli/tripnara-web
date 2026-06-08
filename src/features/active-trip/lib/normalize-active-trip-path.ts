/** 将后端 /trips/:id/active 规范为前端路由 /dashboard/trips/:id/active */
export function normalizeActiveTripPath(
  path: string | null | undefined,
  tripId?: string | null
): string | null {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (trimmed) {
    if (trimmed.startsWith('/dashboard/trips/')) return trimmed;
    if (trimmed.startsWith('/trips/')) return `/dashboard${trimmed}`;
    if (trimmed.startsWith('trips/')) return `/dashboard/${trimmed}`;
    return trimmed;
  }
  if (tripId) return `/dashboard/trips/${tripId}/active`;
  return null;
}
