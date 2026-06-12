import type { RouteAndRunResponse } from '@/api/agent';
import { normalizeBookingCheckoutBundle } from '@/lib/booking-checkout-bundle-ui';
import type {
  BookingCartBudget,
  BookingCartCheckout,
  BookingCartItem,
  BookingCartPayload,
  BookingCartSavingsOpportunity,
  BookingCartSelection,
  BookingCartState,
} from '@/types/booking-cart';

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

function pickStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

export function normalizeBookingCartItem(v: unknown, index: number): BookingCartItem | null {
  if (!isRecord(v)) return null;

  const label = pickStr(v.label_zh) ?? pickStr(v.labelZh);
  if (!label) return null;

  const item_id = pickStr(v.item_id) ?? pickStr(v.itemId) ?? `booking-${index}`;
  const kindRaw = v.kind ?? v.type;
  const kind = typeof kindRaw === 'string' && kindRaw.trim() ? kindRaw.trim() : 'unknown';

  const metadata = isRecord(v.metadata) ? v.metadata : undefined;

  return {
    item_id,
    kind,
    label_zh: label,
    ...(pickStr(v.subtitle_zh) ?? pickStr(v.subtitleZh)
      ? { subtitle_zh: pickStr(v.subtitle_zh) ?? pickStr(v.subtitleZh) }
      : {}),
    ...(pickStr(v.price_label) ?? pickStr(v.priceLabel)
      ? { price_label: pickStr(v.price_label) ?? pickStr(v.priceLabel) }
      : {}),
    ...(pickNum(v.price_numeric) ?? pickNum(v.priceNumeric)
      ? { price_numeric: pickNum(v.price_numeric) ?? pickNum(v.priceNumeric) }
      : {}),
    ...(pickStr(v.currency) ? { currency: pickStr(v.currency) } : {}),
    ...(pickStr(v.href) ? { href: pickStr(v.href) } : {}),
    ...(pickStr(v.booking_url) ?? pickStr(v.bookingUrl)
      ? { booking_url: pickStr(v.booking_url) ?? pickStr(v.bookingUrl) }
      : {}),
    ...(pickStr(v.status) ? { status: pickStr(v.status) } : {}),
    ...(pickStr(v.date_label_zh) ?? pickStr(v.dateLabelZh)
      ? { date_label_zh: pickStr(v.date_label_zh) ?? pickStr(v.dateLabelZh) }
      : {}),
    ...(pickNum(v.night_index) ?? pickNum(v.nightIndex)
      ? { night_index: pickNum(v.night_index) ?? pickNum(v.nightIndex) }
      : pickNum(metadata?.night_index) ?? pickNum(metadata?.nightIndex)
        ? { night_index: pickNum(metadata?.night_index) ?? pickNum(metadata?.nightIndex) }
        : {}),
    ...(pickStr(v.slot_id) ?? pickStr(v.slotId)
      ? { slot_id: pickStr(v.slot_id) ?? pickStr(v.slotId) }
      : pickStr(metadata?.slot_id) ?? pickStr(metadata?.slotId)
        ? { slot_id: pickStr(metadata?.slot_id) ?? pickStr(metadata?.slotId) }
        : {}),
  };
}

function normalizeSelection(v: unknown): BookingCartSelection | undefined {
  if (!isRecord(v)) return undefined;
  const selected_item_ids = pickStringArray(v.selected_item_ids ?? v.selectedItemIds);
  return {
    ...(selected_item_ids ? { selected_item_ids } : {}),
    ...(pickNum(v.total_price_numeric) ?? pickNum(v.totalPriceNumeric)
      ? { total_price_numeric: pickNum(v.total_price_numeric) ?? pickNum(v.totalPriceNumeric) }
      : {}),
    ...(pickStr(v.total_price_label) ?? pickStr(v.totalPriceLabel)
      ? { total_price_label: pickStr(v.total_price_label) ?? pickStr(v.totalPriceLabel) }
      : {}),
    ...(typeof v.within_budget === 'boolean'
      ? { within_budget: v.within_budget }
      : typeof v.withinBudget === 'boolean'
        ? { within_budget: v.withinBudget }
        : {}),
    ...(pickNum(v.budget_limit) ?? pickNum(v.budgetLimit)
      ? { budget_limit: pickNum(v.budget_limit) ?? pickNum(v.budgetLimit) }
      : {}),
    ...(pickStr(v.currency) ? { currency: pickStr(v.currency) } : {}),
  };
}

function normalizeBudget(v: unknown): BookingCartBudget | undefined {
  if (!isRecord(v)) return undefined;
  return {
    ...(pickNum(v.limit) ? { limit: pickNum(v.limit) } : {}),
    ...(pickStr(v.limit_label) ?? pickStr(v.limitLabel)
      ? { limit_label: pickStr(v.limit_label) ?? pickStr(v.limitLabel) }
      : {}),
    ...(pickStr(v.currency) ? { currency: pickStr(v.currency) } : {}),
    ...(pickStr(v.transport_share_hint) ?? pickStr(v.transportShareHint)
      ? { transport_share_hint: pickStr(v.transport_share_hint) ?? pickStr(v.transportShareHint) }
      : {}),
    ...(pickStr(v.accommodation_share_hint) ?? pickStr(v.accommodationShareHint)
      ? {
          accommodation_share_hint:
            pickStr(v.accommodation_share_hint) ?? pickStr(v.accommodationShareHint),
        }
      : {}),
  };
}

function normalizeSavingsOpportunity(v: unknown, index: number): BookingCartSavingsOpportunity | null {
  if (!isRecord(v)) return null;
  const label =
    pickStr(v.label_zh) ??
    pickStr(v.labelZh) ??
    pickStr(v.suggestion_zh) ??
    pickStr(v.suggestionZh) ??
    pickStr(v.title_zh) ??
    pickStr(v.titleZh) ??
    pickStr(v.summary_zh) ??
    pickStr(v.summaryZh);
  if (!label) return null;

  return {
    ...(pickStr(v.opportunity_id) ?? pickStr(v.opportunityId)
      ? { opportunity_id: pickStr(v.opportunity_id) ?? pickStr(v.opportunityId) }
      : { opportunity_id: `savings-${index}` }),
    label_zh: label,
    ...(pickStr(v.suggestion_zh) ?? pickStr(v.suggestionZh)
      ? { suggestion_zh: pickStr(v.suggestion_zh) ?? pickStr(v.suggestionZh) }
      : {}),
    ...(pickStr(v.summary_zh) ?? pickStr(v.summaryZh)
      ? { summary_zh: pickStr(v.summary_zh) ?? pickStr(v.summaryZh) }
      : {}),
    ...(pickStr(v.replace_item_id) ?? pickStr(v.replaceItemId)
      ? { replace_item_id: pickStr(v.replace_item_id) ?? pickStr(v.replaceItemId) }
      : {}),
    ...(pickStr(v.with_item_id) ?? pickStr(v.withItemId)
      ? { with_item_id: pickStr(v.with_item_id) ?? pickStr(v.withItemId) }
      : {}),
    ...(pickStr(v.from_item_id) ?? pickStr(v.fromItemId)
      ? { from_item_id: pickStr(v.from_item_id) ?? pickStr(v.fromItemId) }
      : {}),
    ...(pickStr(v.to_item_id) ?? pickStr(v.toItemId)
      ? { to_item_id: pickStr(v.to_item_id) ?? pickStr(v.toItemId) }
      : {}),
    ...(pickStr(v.suggested_item_id) ?? pickStr(v.suggestedItemId)
      ? { suggested_item_id: pickStr(v.suggested_item_id) ?? pickStr(v.suggestedItemId) }
      : {}),
    ...(pickStr(v.savings_label_zh) ?? pickStr(v.savingsLabelZh)
      ? { savings_label_zh: pickStr(v.savings_label_zh) ?? pickStr(v.savingsLabelZh) }
      : {}),
    ...(pickNum(v.savings_numeric) ?? pickNum(v.savingsNumeric)
      ? { savings_numeric: pickNum(v.savings_numeric) ?? pickNum(v.savingsNumeric) }
      : {}),
    ...(pickStr(v.slot_id) ?? pickStr(v.slotId)
      ? { slot_id: pickStr(v.slot_id) ?? pickStr(v.slotId) }
      : {}),
  };
}

export function normalizeCheckout(v: unknown): BookingCartCheckout | undefined {
  if (!isRecord(v)) return undefined;
  const rawLinks = v.deep_links ?? v.deepLinks;
  const deep_links = Array.isArray(rawLinks)
    ? rawLinks
        .map((link) => {
          if (!isRecord(link)) return null;
          const href = pickStr(link.href);
          if (!href) return null;
          return {
            href,
            ...(pickStr(link.label_zh) ?? pickStr(link.labelZh)
              ? { label_zh: pickStr(link.label_zh) ?? pickStr(link.labelZh) }
              : {}),
            ...(pickStr(link.item_id) ?? pickStr(link.itemId)
              ? { item_id: pickStr(link.item_id) ?? pickStr(link.itemId) }
              : {}),
            ...(pickStr(link.kind) ? { kind: pickStr(link.kind) } : {}),
          };
        })
        .filter(Boolean)
    : undefined;

  const statusRaw = pickStr(v.status);
  const status =
    statusRaw === 'ready' || statusRaw === 'submitted' ? statusRaw : undefined;

  const bundle = normalizeBookingCheckoutBundle(v.bundle);

  const checkout: BookingCartCheckout = {
    ...(status ? { status } : {}),
    ...(deep_links?.length
      ? { deep_links: deep_links as import('@/types/booking-cart').BookingCartDeepLink[] }
      : {}),
    ...(pickStr(v.disclaimer_zh) ?? pickStr(v.disclaimerZh)
      ? { disclaimer_zh: pickStr(v.disclaimer_zh) ?? pickStr(v.disclaimerZh) }
      : {}),
    ...(bundle ? { bundle } : {}),
    ...(pickStr(v.submitted_at) ?? pickStr(v.submittedAt)
      ? { submitted_at: pickStr(v.submitted_at) ?? pickStr(v.submittedAt) }
      : {}),
  };

  if (
    !checkout.deep_links?.length &&
    !checkout.submitted_at &&
    !checkout.bundle &&
    !checkout.disclaimer_zh &&
    !checkout.status
  ) {
    return undefined;
  }
  return checkout;
}

function normalizeCartState(v: unknown): BookingCartState | undefined {
  if (
    v === 'draft' ||
    v === 'optimized' ||
    v === 'over_budget' ||
    v === 'ready_to_checkout' ||
    v === 'checkout_submitted'
  ) {
    return v;
  }
  return undefined;
}

export function isBookingCartPayload(v: unknown): v is BookingCartPayload {
  if (!isRecord(v)) return false;
  if (v.schema !== 'tripnara.booking_cart@v1') return false;
  return Array.isArray(v.items);
}

/** 归一化 booking_cart 快照（route_and_run / apply API 共用） */
export function normalizeBookingCartPayload(raw: unknown): BookingCartPayload | null {
  if (!isBookingCartPayload(raw)) return null;

  const items = raw.items
    .map((item, idx) => normalizeBookingCartItem(item, idx))
    .filter(Boolean) as BookingCartItem[];

  if (!items.length) return null;

  const savingsRaw = raw.savings_opportunities ?? raw.savingsOpportunities;
  const savings_opportunities = Array.isArray(savingsRaw)
    ? (savingsRaw
        .map((o, idx) => normalizeSavingsOpportunity(o, idx))
        .filter(Boolean) as BookingCartSavingsOpportunity[])
    : undefined;

  const checkout = normalizeCheckout(raw.checkout);

  return {
    schema: 'tripnara.booking_cart@v1',
    items,
    ...(pickStr(raw.headline_zh) ? { headline_zh: pickStr(raw.headline_zh) } : {}),
    ...(pickStr(raw.summary_zh) ? { summary_zh: pickStr(raw.summary_zh) } : {}),
    ...(pickStr(raw.trade_off_narrative) ?? pickStr(raw.tradeOffNarrative)
      ? { trade_off_narrative: pickStr(raw.trade_off_narrative) ?? pickStr(raw.tradeOffNarrative) }
      : {}),
    ...(typeof raw.quote_only === 'boolean'
      ? { quote_only: raw.quote_only }
      : typeof raw.quoteOnly === 'boolean'
        ? { quote_only: raw.quoteOnly }
        : {}),
    ...(normalizeCartState(raw.cart_state ?? raw.cartState)
      ? { cart_state: normalizeCartState(raw.cart_state ?? raw.cartState) }
      : {}),
    ...(normalizeSelection(raw.selection) ? { selection: normalizeSelection(raw.selection) } : {}),
    ...(normalizeBudget(raw.budget) ? { budget: normalizeBudget(raw.budget) } : {}),
    ...(savings_opportunities?.length ? { savings_opportunities } : {}),
    ...(checkout && (checkout.deep_links?.length || checkout.submitted_at) ? { checkout } : {}),
  };
}

/** ui_display.booking_cart */
export function pickBookingCartFromRouteRun(response: RouteAndRunResponse): BookingCartPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const uiDisplay = isRecord(payload?.ui_display) ? payload.ui_display : undefined;
  const raw = uiDisplay?.booking_cart;
  return normalizeBookingCartPayload(raw);
}

export function hasBookingCartUi(cart: BookingCartPayload | null | undefined): boolean {
  return Boolean(cart?.items?.length);
}

export function bookingCartItemHref(item: BookingCartItem): string | undefined {
  const href = item.href ?? item.booking_url;
  return typeof href === 'string' && href.trim() ? href.trim() : undefined;
}

export function bookingCartSelectedIds(cart: BookingCartPayload): Set<string> {
  return new Set(cart.selection?.selected_item_ids ?? []);
}

export function isBookingCartItemSelected(itemId: string, selectedIds: Set<string>): boolean {
  return selectedIds.has(itemId);
}

/** over_budget 时禁用 checkout，ready_to_checkout / checkout_submitted 按状态控制 */
export function canBookCartItem(
  cartState: BookingCartState | undefined,
  itemId: string,
  selectedIds: Set<string>
): boolean {
  if (cartState === 'checkout_submitted') return true;
  if (cartState === 'ready_to_checkout') return selectedIds.has(itemId) || selectedIds.size === 0;
  if (cartState === 'over_budget') return false;
  if (selectedIds.size === 0) return true;
  return selectedIds.has(itemId);
}

export function canSubmitBookingCartCheckout(cartState: BookingCartState | undefined): boolean {
  return cartState === 'ready_to_checkout' || cartState === 'optimized' || cartState === 'draft';
}

export function needsOverBudgetAcknowledge(cart: BookingCartPayload): boolean {
  return cart.cart_state === 'over_budget' && cart.selection?.within_budget === false;
}

export function applySavingsSwap(
  selectedIds: Set<string>,
  opportunity: BookingCartSavingsOpportunity
): Set<string> {
  const next = new Set(selectedIds);
  const replaceId =
    opportunity.replace_item_id ?? opportunity.from_item_id;
  const withId =
    opportunity.with_item_id ?? opportunity.to_item_id ?? opportunity.suggested_item_id;
  if (!replaceId || !withId) return next;
  if (next.has(replaceId)) {
    next.delete(replaceId);
    next.add(withId);
  } else {
    next.add(withId);
  }
  return next;
}

export function estimateWithinBudgetAfterSwap(
  cart: BookingCartPayload,
  selectedIds: Set<string>
): boolean {
  if (cart.cart_state !== 'over_budget') {
    return cart.selection?.within_budget !== false;
  }
  const budgetLimit = cart.budget?.limit;
  if (budgetLimit == null || !Number.isFinite(budgetLimit)) return true;

  let total = 0;
  for (const item of cart.items) {
    if (!selectedIds.has(item.item_id)) continue;
    if (item.price_numeric != null && Number.isFinite(item.price_numeric)) {
      total += item.price_numeric;
    }
  }
  if (total <= 0 && cart.selection?.total_price_numeric != null) {
    return cart.selection.total_price_numeric <= budgetLimit;
  }
  return total <= budgetLimit;
}

export const BOOKING_CART_STATE_LABELS: Record<BookingCartState, string> = {
  draft: '预选最低价（未设预算）',
  optimized: '组合在预算内',
  over_budget: '超出预算',
  ready_to_checkout: '可提交预订',
  checkout_submitted: '已提交预订意向',
};
