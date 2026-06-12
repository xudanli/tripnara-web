import { agentApi } from '@/api/agent';
import type {
  BookingCartApplyAction,
  BookingCartApplyResponse,
  BookingCartCheckout,
  BookingCartPayload,
} from '@/types/booking-cart';
import { normalizeBookingCartPayload, normalizeCheckout } from '@/lib/booking-cart-ui';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function mergeCheckoutOntoCart(
  cart: BookingCartPayload,
  checkout: BookingCartCheckout | undefined
): BookingCartPayload {
  if (!checkout) return cart;
  return { ...cart, checkout };
}

function normalizeApplyResponse(
  data: Record<string, unknown>,
  fallbackCart: BookingCartPayload
): BookingCartApplyResponse {
  const cartRaw = data.booking_cart ?? data.cart ?? data.bookingCart;
  const cart = normalizeBookingCartPayload(cartRaw) ?? fallbackCart;

  const checkoutFromTop = normalizeCheckout(data.checkout);
  const checkout = checkoutFromTop ?? cart.checkout;

  const statusRaw = data.status;
  const status =
    statusRaw === 'OK' || statusRaw === 'REJECTED' ? statusRaw : undefined;

  const message =
    typeof data.message === 'string' && data.message.trim() ? data.message.trim() : undefined;

  const mergedCart = mergeCheckoutOntoCart(cart, checkout);

  return {
    ...(status ? { status } : {}),
    cart: mergedCart,
    ...(checkout ? { checkout } : {}),
    ...(message ? { message } : {}),
  };
}

export async function applyBookingCartAction(params: {
  tripId: string;
  cart: BookingCartPayload;
  action: BookingCartApplyAction;
  payload?: Record<string, unknown>;
}): Promise<BookingCartApplyResponse> {
  const trip_id = sanitizeRouteRunTripId(params.tripId);
  if (!trip_id) {
    throw new Error('需要有效行程 ID 才能更新预订清单');
  }

  const data = await agentApi.applyBookingCartAction({
    trip_id,
    cart: params.cart,
    action: params.action,
    ...(params.payload ? { payload: params.payload } : {}),
  });

  if (isRecord(data)) {
    return normalizeApplyResponse(data, params.cart);
  }

  const cart = normalizeBookingCartPayload((data as BookingCartApplyResponse).cart) ?? params.cart;
  return {
    ...data,
    cart,
  };
}

export function openBookingCartDeepLinks(checkout: BookingCartApplyResponse['checkout']): number {
  const links = checkout?.deep_links ?? [];
  let opened = 0;
  for (const link of links) {
    if (typeof link.href === 'string' && link.href.trim()) {
      window.open(link.href.trim(), '_blank', 'noopener,noreferrer');
      opened += 1;
    }
  }
  return opened;
}

export function deepLinkForCartItem(
  checkout: BookingCartApplyResponse['checkout'],
  itemId: string
): string | undefined {
  const link = checkout?.deep_links?.find((l) => l.item_id === itemId);
  return typeof link?.href === 'string' && link.href.trim() ? link.href.trim() : undefined;
}
