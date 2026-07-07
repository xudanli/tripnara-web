/** 行中执行页 */
export function buildTripExecutePath(tripId: string): string {
  return `/dashboard/execute?tripId=${encodeURIComponent(tripId)}`;
}

/** 行程详情 · 时间轴 Tab 并高亮行程项 */
export function buildTripDetailTimelineItemPath(tripId: string, itineraryItemId: string): string {
  const params = new URLSearchParams({
    tab: 'timeline',
    highlightItem: itineraryItemId,
  });
  return `/dashboard/trips/${encodeURIComponent(tripId)}?${params.toString()}`;
}

export function parseTripDetailHighlightItemId(
  searchParams: URLSearchParams,
): string | null {
  const raw = searchParams.get('highlightItem')?.trim();
  return raw || null;
}

export function tripDetailExecuteTabRedirectAllowed(
  status: string | undefined,
): boolean {
  return status === 'IN_PROGRESS' || status === 'COMPLETED';
}
