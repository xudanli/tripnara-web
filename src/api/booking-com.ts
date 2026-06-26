/**
 * Booking.com 租车 API
 *
 * 直接 REST 调用，用于租车搜索
 * 端点: POST /api/booking-com/search
 */

import apiClient from './client';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  const payload = response?.data;
  if (!payload || !payload.success) {
    const message =
      payload && !payload.success
        ? payload.error?.message || '租车查询失败'
        : '租车查询失败';
    throw new Error(message);
  }
  if (payload.data == null) {
    throw new Error('租车查询响应为空');
  }
  return payload.data;
}

export interface BookingComSearchRequest {
  pick_up_latitude: number;
  pick_up_longitude: number;
  drop_off_latitude: number;
  drop_off_longitude: number;
  pick_up_date: string; // YYYY-MM-DD
  drop_off_date: string; // YYYY-MM-DD
  pick_up_time?: string; // HH:mm
  drop_off_time?: string; // HH:mm
  driver_age?: number;
  currency_code?: string; // USD, EUR, etc.
  location?: string; // 国家/地区代码，如 US, IS
}

export interface CarRentalItem {
  id?: string;
  vehicleName?: string;
  vehicleType?: string;
  supplierName?: string;
  price?: { amount: number; currency: string };
  totalPrice?: number;
  currency?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  bookingUrl?: string;
  [key: string]: unknown;
}

export interface BookingComSearchResponse {
  carRentals?: CarRentalItem[];
  results?: CarRentalItem[];
  [key: string]: unknown;
}

export const bookingComApi = {
  /**
   * 搜索租车
   * POST /api/booking-com/search
   */
  search: async (params: BookingComSearchRequest): Promise<BookingComSearchResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<BookingComSearchResponse>>(
      '/booking-com/search',
      params,
    );
    return handleResponse(response);
  },

  /**
   * 服务健康检查
   * GET /api/booking-com/health
   */
  health: async (): Promise<{ available?: boolean; ok?: boolean; service?: string }> => {
    const response = await apiClient.get<
      ApiResponseWrapper<{ available: boolean; service: string }>
    >('/booking-com/health');
    return handleResponse(response);
  },

  /**
   * 监控统计
   * GET /api/booking-com/monitoring/stats
   */
  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get('/booking-com/monitoring/stats');
    return response.data;
  },

  /**
   * 成本检查
   * GET /api/booking-com/monitoring/cost-check
   */
  getCostCheck: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get('/booking-com/monitoring/cost-check');
    return response.data;
  },
};
