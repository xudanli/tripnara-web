/** tripnara.booking_checkout_bundle@v1 — submit_checkout 锁价结算单 */
export type BookingCheckoutLockStatus = 'LOCKED' | 'QUOTE_ONLY' | 'LOCK_FAILED';

export interface BookingCheckoutBundleLine {
  item_id?: string;
  label_zh?: string;
  kind?: string;
  lock_status: BookingCheckoutLockStatus;
  lock_detail_zh?: string;
  price_numeric?: number;
  price_label?: string;
  currency?: string;
  href?: string;
  [key: string]: unknown;
}

export interface BookingCheckoutBundle {
  schema: 'tripnara.booking_checkout_bundle@v1';
  total_locked_price_numeric?: number;
  total_locked_price_label?: string;
  currency?: string;
  expires_at?: string;
  quote_only?: boolean;
  disclaimer_zh?: string;
  lines: BookingCheckoutBundleLine[];
  [key: string]: unknown;
}

export function isBookingCheckoutBundle(v: unknown): v is BookingCheckoutBundle {
  return (
    v != null &&
    typeof v === 'object' &&
    (v as BookingCheckoutBundle).schema === 'tripnara.booking_checkout_bundle@v1' &&
    Array.isArray((v as BookingCheckoutBundle).lines)
  );
}
