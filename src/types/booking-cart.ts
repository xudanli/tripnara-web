/** tripnara.booking_cart@v1 — 航班/酒店/租车 MCP 快照 + P2+ 联合优化 + checkout */
export type BookingCartItemKind =
  | 'flight'
  | 'hotel'
  | 'accommodation'
  | 'car_rental'
  | (string & {});

export type BookingCartItemStatus = 'ready' | 'needs_review' | (string & {});

export type BookingCartState =
  | 'draft'
  | 'optimized'
  | 'over_budget'
  | 'ready_to_checkout'
  | 'checkout_submitted';

export type BookingCartApplyAction =
  | 'update_selection'
  | 'apply_saving'
  | 'confirm_ready'
  | 'submit_checkout';

export interface BookingCartItem {
  item_id: string;
  kind: BookingCartItemKind;
  label_zh: string;
  subtitle_zh?: string;
  price_label?: string;
  price_numeric?: number;
  currency?: string;
  href?: string;
  booking_url?: string;
  status?: BookingCartItemStatus;
  date_label_zh?: string;
  night_index?: number;
  slot_id?: string;
  [key: string]: unknown;
}

export interface BookingCartSelection {
  selected_item_ids?: string[];
  total_price_numeric?: number;
  total_price_label?: string;
  within_budget?: boolean;
  budget_limit?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface BookingCartBudget {
  limit?: number;
  limit_label?: string;
  currency?: string;
  transport_share_hint?: string;
  accommodation_share_hint?: string;
  [key: string]: unknown;
}

export interface BookingCartSavingsOpportunity {
  opportunity_id?: string;
  label_zh?: string;
  suggestion_zh?: string;
  summary_zh?: string;
  title_zh?: string;
  replace_item_id?: string;
  with_item_id?: string;
  suggested_item_id?: string;
  from_item_id?: string;
  to_item_id?: string;
  savings_label_zh?: string;
  savings_numeric?: number;
  slot_id?: string;
  [key: string]: unknown;
}

export interface BookingCartDeepLink {
  item_id?: string;
  label_zh?: string;
  href: string;
  kind?: string;
  [key: string]: unknown;
}

export interface BookingCartCheckout {
  status?: 'ready' | 'submitted';
  deep_links?: BookingCartDeepLink[];
  disclaimer_zh?: string;
  bundle?: import('@/types/booking-checkout-bundle').BookingCheckoutBundle;
  submitted_at?: string;
  [key: string]: unknown;
}

export interface BookingCartPayload {
  schema: 'tripnara.booking_cart@v1';
  items: BookingCartItem[];
  headline_zh?: string;
  summary_zh?: string;
  /** 全局背包锁定高光锚点后的中文说明 */
  trade_off_narrative?: string;
  /** 采样报价，下单前需用户再次确认 */
  quote_only?: boolean;
  cart_state?: BookingCartState;
  selection?: BookingCartSelection;
  budget?: BookingCartBudget;
  savings_opportunities?: BookingCartSavingsOpportunity[];
  checkout?: BookingCartCheckout;
  [key: string]: unknown;
}

export interface BookingCartApplyRequest {
  trip_id: string;
  cart: BookingCartPayload;
  action: BookingCartApplyAction;
  payload?: Record<string, unknown>;
}

export interface BookingCartApplyResponse {
  status?: 'OK' | 'REJECTED';
  /** 服务端归一化后的购物车（优先 booking_cart，兼容 cart） */
  cart: BookingCartPayload;
  checkout?: BookingCartCheckout;
  message?: string;
}
