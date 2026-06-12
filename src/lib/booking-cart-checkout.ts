import { agentApi } from '@/api/agent';
import type {
  BookingCartApplyAction,
  BookingCartApplyResponse,
  BookingCartPayload,
} from '@/types/booking-cart';
import { normalizeBookingCartPayload } from '@/lib/booking-cart-ui';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

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

  const cart = normalizeBookingCartPayload(data.cart) ?? params.cart;
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
