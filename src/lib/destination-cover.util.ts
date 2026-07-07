export function normalizeDestinationCode(code?: string | null): string | undefined {
  const normalized = code?.trim().toUpperCase();
  return normalized || undefined;
}

/** 目的地封面 — 读 CountryProfile.coverImageUrl（与 BFF listSummary.coverImageUrl 兜底同源） */
export function resolveDestinationCoverImageUrl(input: {
  /** GET /countries/:code/profile → coverImageUrl */
  countryCoverImageUrl?: string | null;
}): string | undefined {
  const url = input.countryCoverImageUrl?.trim();
  return url || undefined;
}
