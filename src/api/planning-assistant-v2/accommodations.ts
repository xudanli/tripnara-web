/**
 * Planning Assistant V2 - 住宿加入行程
 *
 * POST /api/agent/planning-assistant/v2/trips/:tripId/accommodations/apply
 */

import planningAssistantV2Client from './client';
import type { Accommodation } from './types';

export type AccommodationCardActionType =
  | 'view_accommodation'
  | 'add_accommodation_to_itinerary'
  | 'book_accommodation'
  | string;

/** apply 请求体 accommodationCard 字段（与 payload / action.params.applySnapshot 同形） */
export type AccommodationCardSnapshot = Record<string, unknown> & {
  id: string;
  source?: Accommodation['source'] | string;
  name: string;
  checkIn?: string;
  check_out?: string;
  checkOut?: string;
  check_in?: string;
  nightIndex?: number;
  address?: string;
  url?: string;
  priceLabel?: string;
  price?: string;
  listing_lat?: number;
  listing_lng?: number;
  listingLat?: number;
  listingLng?: number;
  location?: { lat: number; lng: number };
};

export interface AccommodationCardAction {
  action: AccommodationCardActionType;
  label: string;
  labelCN?: string;
  params?: {
    url?: string;
    accommodationId?: string;
    accommodationIndex?: number;
    replaceExisting?: boolean;
    /** 后端下发的完整卡片快照，apply 时优先使用 */
    applySnapshot?: AccommodationCardSnapshot;
    apply_snapshot?: AccommodationCardSnapshot;
    accommodationCard?: AccommodationCardSnapshot;
    accommodation_card?: AccommodationCardSnapshot;
    [key: string]: unknown;
  };
}

export interface ApplyAccommodationToTripRequest {
  /** 与 v2/chat、route_and_run options.client_session_id 一致 */
  sessionId: string;
  /** 与 payload.accommodations[accommodationIndex] 对齐 */
  accommodationIndex: number;
  /** 完整卡片快照（优先 action.params.applySnapshot） */
  accommodationCard: AccommodationCardSnapshot;
  replaceExisting?: boolean;
}

export interface ApplyAccommodationToTripResponse {
  success?: boolean;
  created?: boolean;
  replaced?: boolean;
  itemId?: string;
  message?: string;
  messageCN?: string;
  /** 业务态：当天已有住宿，需用户确认替换 */
  needsReplaceConfirm?: boolean;
  existingItem?: {
    id?: string;
    name?: string;
    nameCN?: string;
  };
}

export const accommodationsApi = {
  applyToTrip: async (
    tripId: string,
    body: ApplyAccommodationToTripRequest
  ): Promise<ApplyAccommodationToTripResponse> => {
    const response = await planningAssistantV2Client.post<ApplyAccommodationToTripResponse>(
      `/trips/${encodeURIComponent(tripId)}/accommodations/apply`,
      body
    );
    return response.data;
  },
};
