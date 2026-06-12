import {
  isBookingCheckoutBundle,
  type BookingCheckoutBundle,
  type BookingCheckoutBundleLine,
  type BookingCheckoutLockStatus,
} from '@/types/booking-checkout-bundle';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function normalizeLockStatus(v: unknown): BookingCheckoutLockStatus {
  const s = String(v ?? '').toUpperCase();
  if (s === 'LOCKED' || s === 'QUOTE_ONLY' || s === 'LOCK_FAILED') return s;
  return 'QUOTE_ONLY';
}

function normalizeBundleLine(v: unknown, index: number): BookingCheckoutBundleLine | null {
  if (!isRecord(v)) return null;
  const label = pickStr(v.label_zh) ?? pickStr(v.labelZh);
  if (!label) return null;

  return {
    lock_status: normalizeLockStatus(v.lock_status ?? v.lockStatus),
    label_zh: label,
    ...(pickStr(v.item_id) ?? pickStr(v.itemId)
      ? { item_id: pickStr(v.item_id) ?? pickStr(v.itemId) }
      : {}),
    ...(pickStr(v.kind) ? { kind: pickStr(v.kind) } : {}),
    ...(pickStr(v.lock_detail_zh) ?? pickStr(v.lockDetailZh)
      ? { lock_detail_zh: pickStr(v.lock_detail_zh) ?? pickStr(v.lockDetailZh) }
      : {}),
    ...(pickNum(v.price_numeric) ?? pickNum(v.priceNumeric)
      ? { price_numeric: pickNum(v.price_numeric) ?? pickNum(v.priceNumeric) }
      : {}),
    ...(pickStr(v.price_label) ?? pickStr(v.priceLabel)
      ? { price_label: pickStr(v.price_label) ?? pickStr(v.priceLabel) }
      : {}),
    ...(pickStr(v.currency) ? { currency: pickStr(v.currency) } : {}),
    ...(pickStr(v.href) ? { href: pickStr(v.href) } : {}),
    ...(pickStr(v.id) && !pickStr(v.item_id) ? { item_id: pickStr(v.id) } : {}),
  };
}

export function normalizeBookingCheckoutBundle(raw: unknown): BookingCheckoutBundle | null {
  if (!isBookingCheckoutBundle(raw)) return null;

  const lines = raw.lines
    .map((line, idx) => normalizeBundleLine(line, idx))
    .filter(Boolean) as BookingCheckoutBundleLine[];

  if (!lines.length) return null;

  return {
    schema: 'tripnara.booking_checkout_bundle@v1',
    lines,
    ...(pickNum(raw.total_locked_price_numeric) ?? pickNum(raw.totalLockedPriceNumeric)
      ? {
          total_locked_price_numeric:
            pickNum(raw.total_locked_price_numeric) ?? pickNum(raw.totalLockedPriceNumeric),
        }
      : {}),
    ...(pickStr(raw.total_locked_price_label) ?? pickStr(raw.totalLockedPriceLabel)
      ? {
          total_locked_price_label:
            pickStr(raw.total_locked_price_label) ?? pickStr(raw.totalLockedPriceLabel),
        }
      : {}),
    ...(pickStr(raw.currency) ? { currency: pickStr(raw.currency) } : {}),
    ...(pickStr(raw.expires_at) ?? pickStr(raw.expiresAt)
      ? { expires_at: pickStr(raw.expires_at) ?? pickStr(raw.expiresAt) }
      : {}),
    ...(typeof raw.quote_only === 'boolean'
      ? { quote_only: raw.quote_only }
      : typeof raw.quoteOnly === 'boolean'
        ? { quote_only: raw.quoteOnly }
        : {}),
    ...(pickStr(raw.disclaimer_zh) ?? pickStr(raw.disclaimerZh)
      ? { disclaimer_zh: pickStr(raw.disclaimer_zh) ?? pickStr(raw.disclaimerZh) }
      : {}),
  };
}

export function formatBundleTotalPrice(bundle: BookingCheckoutBundle): string | null {
  if (bundle.total_locked_price_label) return bundle.total_locked_price_label;
  if (bundle.total_locked_price_numeric != null) {
    const cur = bundle.currency ?? '';
    return `${cur ? `${cur} ` : ''}${bundle.total_locked_price_numeric.toLocaleString()}`;
  }
  return null;
}

export function bundleExpiresAtMs(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) ? ms : null;
}

export function bundleRemainingSeconds(expiresAt?: string): number | null {
  const ms = bundleExpiresAtMs(expiresAt);
  if (ms == null) return null;
  return Math.max(0, Math.floor((ms - Date.now()) / 1000));
}

export function formatBundleCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const BUNDLE_LOCK_STATUS_META: Record<
  BookingCheckoutLockStatus,
  { label: string; badgeClass: string }
> = {
  LOCKED: {
    label: '已锁价',
    badgeClass:
      'border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/35 dark:text-emerald-100',
  },
  QUOTE_ONLY: {
    label: '采样价',
    badgeClass:
      'border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100',
  },
  LOCK_FAILED: {
    label: '锁价失败',
    badgeClass:
      'border-red-500/40 bg-red-50 text-red-950 dark:bg-red-950/35 dark:text-red-100',
  },
};
