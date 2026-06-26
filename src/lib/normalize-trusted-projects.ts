import type { TrustedProjectListing } from '@/types/trusted-projects';

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

function pickOptionalString(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string') return v;
  }
  return undefined;
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/** 归一化单条 listing（兼容 snake_case） */
export function normalizeTrustedProjectListing(raw: unknown): TrustedProjectListing | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = pickString(r, 'id', 'listingId', 'listing_id');
  if (!id) return null;

  const commercialRaw = pickString(r, 'commercialType', 'commercial_type').toUpperCase();
  const commercialType =
    commercialRaw === 'COMMERCIAL' ? 'COMMERCIAL' : ('NON_COMMERCIAL' as const);

  const statusRaw = pickString(r, 'listingStatus', 'listing_status', 'status').toLowerCase();
  const listingStatus = (
    ['draft', 'pending_review', 'published', 'closed', 'suspended'].includes(statusRaw)
      ? statusRaw
      : 'draft'
  ) as TrustedProjectListing['listingStatus'];

  const slotsTotal = pickNumber(r, 'slotsTotal', 'slots_total') ?? 1;
  const slotsFilled = pickNumber(r, 'slotsFilled', 'slots_filled') ?? 0;
  const slotsRemaining =
    pickNumber(r, 'slotsRemaining', 'slots_remaining', 'slots_remaining_count') ??
    Math.max(0, slotsTotal - slotsFilled);

  const publisherSubjectRaw = pickString(
    r,
    'publisherSubjectType',
    'publisher_subject_type',
  ).toUpperCase();
  const publisherSubjectType =
    publisherSubjectRaw === 'ORGANIZATION'
      ? ('ORGANIZATION' as const)
      : publisherSubjectRaw === 'USER'
        ? ('USER' as const)
        : pickOptionalString(r, 'organizationId', 'organization_id')
          ? ('ORGANIZATION' as const)
          : undefined;

  return {
    id,
    title: pickString(r, 'title', 'name') || '未命名项目',
    destination: pickString(r, 'destination') || '—',
    startDate: pickString(r, 'startDate', 'start_date'),
    endDate: pickString(r, 'endDate', 'end_date'),
    summary: pickOptionalString(r, 'summary', 'description'),
    commercialType,
    slotsTotal,
    slotsRemaining,
    budgetMinCents: pickNumber(r, 'budgetMinCents', 'budget_min_cents') ?? null,
    budgetMaxCents: pickNumber(r, 'budgetMaxCents', 'budget_max_cents') ?? null,
    riskDisclosure: pickOptionalString(r, 'riskDisclosure', 'risk_disclosure'),
    refundPolicy: pickOptionalString(r, 'refundPolicy', 'refund_policy') ?? null,
    listingStatus,
    organizationId: pickOptionalString(r, 'organizationId', 'organization_id') ?? null,
    publisherSubjectType,
    publisherSubjectId: pickOptionalString(r, 'publisherSubjectId', 'publisher_subject_id'),
    publisherDisplayName: pickOptionalString(
      r,
      'publisherDisplayName',
      'publisher_display_name',
    ),
    responsibleUserId: pickOptionalString(r, 'responsibleUserId', 'responsible_user_id'),
    responsibleUserDisplayName:
      pickOptionalString(r, 'responsibleUserDisplayName', 'responsible_user_display_name') ??
      null,
    tripId: pickOptionalString(r, 'tripId', 'trip_id') ?? null,
    createdAt: pickOptionalString(r, 'createdAt', 'created_at'),
    publishedAt: pickOptionalString(r, 'publishedAt', 'published_at') ?? null,
  };
}

/** GET /trusted-projects 响应：数组或 { items, total } */
export function normalizeTrustedProjectListResponse(data: unknown): TrustedProjectListing[] {
  if (Array.isArray(data)) {
    return data
      .map(normalizeTrustedProjectListing)
      .filter((item): item is TrustedProjectListing => item != null);
  }

  if (data && typeof data === 'object') {
    const r = data as Record<string, unknown>;
    const listRaw =
      r.items ?? r.listings ?? r.results ?? r.data ?? r.records ?? null;

    if (Array.isArray(listRaw)) {
      return listRaw
        .map(normalizeTrustedProjectListing)
        .filter((item): item is TrustedProjectListing => item != null);
    }
  }

  return [];
}

export function normalizeTrustedProjectDetailResponse(data: unknown): TrustedProjectListing | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const r = data as Record<string, unknown>;
    if (r.listing && typeof r.listing === 'object') {
      return normalizeTrustedProjectListing(r.listing);
    }
    if (r.item && typeof r.item === 'object') {
      return normalizeTrustedProjectListing(r.item);
    }
    return normalizeTrustedProjectListing(data);
  }
  return null;
}
