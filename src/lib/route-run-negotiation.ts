import type { NegotiationPayload, RouteAndRunResponse } from '@/api/agent';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';

export interface RouteRunNegotiationState {
  payload: NegotiationPayload;
  requestId: string;
}

export function pickRouteRunNegotiationFromResponse(
  response: RouteAndRunResponse,
): RouteRunNegotiationState | null {
  const payload = response.result.payload?.negotiation_payload;
  if (payload?.status !== 'PENDING_USER_DECISION') return null;
  return {
    payload,
    requestId: response.request_id,
  };
}

export function applyRouteRunNegotiationToStore(response: RouteAndRunResponse): void {
  const negotiation = pickRouteRunNegotiationFromResponse(response);
  useWorldModelGuardsStore.getState().setRouteRunNegotiation(negotiation);
}

export function clearRouteRunNegotiationFromStore(): void {
  useWorldModelGuardsStore.getState().setRouteRunNegotiation(null);
}
