import type { GuideTripContext } from '@/types/guide-import';

const DEFAULT_COUNTRY =
  (import.meta.env.VITE_GUIDE_DEFAULT_COUNTRY_CODE as string | undefined)?.trim().toUpperCase() ||
  undefined;

/** 从文案中推断 ISO 3166-1 alpha-2（联调常用：冰岛 → IS） */
export function inferCountryCodeFromText(...fragments: (string | undefined | null)[]): string | undefined {
  const text = fragments.filter(Boolean).join(' ');
  if (!text) return undefined;
  if (/冰岛|iceland|reykjav[ií]k|雷克雅未克|南岸|维克|霍芬|蓝湖/i.test(text)) return 'IS';
  if (/日本|japan|东京|大阪|京都/i.test(text)) return 'JP';
  if (/中国|china|北京|上海/i.test(text)) return 'CN';
  return undefined;
}

export function resolveGuideSessionCountryCode(opts: {
  tripContext?: GuideTripContext;
  sessionCountryCode?: string | null;
  destinationHint?: string | null;
  /** 已导入攻略标题等，用于推断 */
  sourceTexts?: string[];
}): string | undefined {
  const fromContext = opts.tripContext?.countryCode?.trim().toUpperCase();
  if (fromContext) return fromContext;

  const fromSession = opts.sessionCountryCode?.trim().toUpperCase();
  if (fromSession) return fromSession;

  if (DEFAULT_COUNTRY) return DEFAULT_COUNTRY;

  const inferred = inferCountryCodeFromText(
    opts.destinationHint ?? undefined,
    opts.tripContext?.destination,
    ...(opts.sourceTexts ?? []),
  );
  if (inferred) return inferred;

  return undefined;
}
