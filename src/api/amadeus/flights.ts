/**
 * Amadeus 航班搜索 API
 *
 * 接口文档: POST /api/amadeus/search/flights
 */

import apiClient from '@/api/client';

export interface FlightSearchRequest {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  adults: number;
  returnDate?: string;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  includedAirlineCodes?: string;
  excludedAirlineCodes?: string;
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  max?: number;
}

export interface FlightSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
}

export interface FlightItinerary {
  segments: FlightSegment[];
}

export interface FlightOffer {
  type: string;
  id: string;
  price: { currency: string; total: string };
  itineraries: FlightItinerary[];
}

export interface FlightSearchResponse {
  data: FlightOffer[];
}

export const flightsApi = {
  /**
   * 搜索航班
   * POST /amadeus/search/flights
   */
  search: async (params: FlightSearchRequest): Promise<FlightOffer[]> => {
    const response = await apiClient.post<{ success: boolean; data: FlightSearchResponse }>(
      '/amadeus/search/flights',
      params
    );
    const body = response.data;
    if (!body.success || !body.data?.data) {
      throw new Error('航班搜索失败');
    }
    return body.data.data;
  },
};
