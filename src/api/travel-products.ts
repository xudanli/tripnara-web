import apiClient from './client';
import type {
  ListTravelProductExperiencesParams,
  ListTravelProductOfferingsParams,
  ListTravelProductSessionsParams,
  TravelProductExperienceDefinition,
  TravelProductOffering,
  TravelProductPlaceExperiencesPayload,
  TravelProductSession,
  TravelProductTaxonomy,
} from '@/types/travel-products';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  if (!response.data.success) {
    const errorResponse = response.data as ErrorResponse;
    throw new Error(errorResponse.error?.message || '请求失败');
  }
  return (response.data as SuccessResponse<T>).data;
}

function toQuery(params: Record<string, string | number | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    out[key] = String(value);
  }
  return out;
}

/** C 端体验产品 Catalog · Base `/api/travel-products` */
export const travelProductsApi = {
  getTaxonomy: async (): Promise<TravelProductTaxonomy> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductTaxonomy>>(
      '/travel-products/taxonomy',
    );
    return handleResponse(response);
  },

  listExperiences: async (
    params: ListTravelProductExperiencesParams = {},
  ): Promise<TravelProductExperienceDefinition[]> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductExperienceDefinition[]>>(
      '/travel-products/experiences',
      { params: toQuery(params) },
    );
    return handleResponse(response);
  },

  getExperienceByCode: async (code: string): Promise<TravelProductExperienceDefinition> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductExperienceDefinition>>(
      `/travel-products/experiences/by-code/${encodeURIComponent(code)}`,
    );
    return handleResponse(response);
  },

  listOfferings: async (
    params: ListTravelProductOfferingsParams = {},
  ): Promise<TravelProductOffering[]> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductOffering[]>>(
      '/travel-products/offerings',
      { params: toQuery(params) },
    );
    return handleResponse(response);
  },

  getOffering: async (offeringId: string): Promise<TravelProductOffering> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductOffering>>(
      `/travel-products/offerings/${encodeURIComponent(offeringId)}`,
    );
    return handleResponse(response);
  },

  listSessions: async (
    offeringId: string,
    params: ListTravelProductSessionsParams = {},
  ): Promise<TravelProductSession[]> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductSession[]>>(
      `/travel-products/offerings/${encodeURIComponent(offeringId)}/sessions`,
      { params: toQuery(params) },
    );
    return handleResponse(response);
  },

  getSession: async (sessionId: string): Promise<TravelProductSession> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductSession>>(
      `/travel-products/sessions/${encodeURIComponent(sessionId)}`,
    );
    return handleResponse(response);
  },

  /** 地点关联体验：GET /travel-products/places/{placeId}/experiences */
  listPlaceExperiences: async (
    placeId: number | string,
  ): Promise<TravelProductPlaceExperiencesPayload> => {
    const response = await apiClient.get<ApiResponseWrapper<TravelProductPlaceExperiencesPayload>>(
      `/travel-products/places/${encodeURIComponent(String(placeId))}/experiences`,
    );
    return handleResponse(response);
  },
};
