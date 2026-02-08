/**
 * Airbnb MCP API 客户端
 * 
 * Base URL: /api/airbnb
 * 提供房源搜索、详情查询、授权管理等功能
 */

import apiClient from './client';

// ==================== 类型定义 ====================

export interface AirbnbSearchParams {
  location: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  checkin?: string;
  checkout?: string;
  page?: number;
  ignoreRobotsText?: boolean;
}

export interface AirbnbListing {
  id: string;
  url: string;
  demandStayListing: {
    id: string;
    description: {
      name: {
        localizedStringWithTranslationPreference: string;
      };
    };
    location: {
      coordinate: {
        latitude: number;
        longitude: number;
      };
    };
  };
  badges: string;
  structuredContent: {
    primaryLine: string;
    secondaryLine: string;
  };
  avgRatingA11yLabel: string;
  structuredDisplayPrice: {
    primaryLine: {
      accessibilityLabel: string;
    };
  };
}

export interface AirbnbSearchResponse {
  searchUrl: string;
  results: AirbnbListing[];
  total: number;
}

export interface AirbnbListingDetailsParams {
  checkin?: string;
  checkout?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  ignoreRobotsText?: boolean;
}

export interface AirbnbListingDetails {
  listingId: string;
  name: string;
  description?: string;
  amenities?: string[];
  photos?: Array<{
    url: string;
    caption?: string;
  }>;
  host?: {
    name: string;
    avatar?: string;
  };
  reviews?: Array<{
    rating: number;
    comment: string;
    date: string;
  }>;
  price?: {
    total: number;
    currency: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface AirbnbAuthStatus {
  isAuthorized: boolean;
  connectionId?: string;
  authorizationUrl?: string;
}

export interface AirbnbAuthUrl {
  authorizationUrl: string;
  connectionId: string;
}

export interface AirbnbAuthVerify {
  isAuthorized: boolean;
  message: string;
}

export interface AirbnbTool {
  name: string;
  description: string;
}

export interface AirbnbToolsResponse {
  tools: AirbnbTool[];
}

// ==================== API 客户端 ====================

export const airbnbApi = {
  /**
   * 搜索房源
   * POST /api/airbnb/search
   */
  search: async (params: AirbnbSearchParams): Promise<AirbnbSearchResponse> => {
    const response = await apiClient.post<AirbnbSearchResponse>(
      '/airbnb/search',
      params
    );
    return response.data;
  },

  /**
   * 获取房源详情
   * GET /api/airbnb/listing/:listingId
   */
  getListingDetails: async (
    listingId: string,
    params?: AirbnbListingDetailsParams
  ): Promise<AirbnbListingDetails> => {
    const queryParams = new URLSearchParams();
    if (params?.checkin) queryParams.append('checkin', params.checkin);
    if (params?.checkout) queryParams.append('checkout', params.checkout);
    if (params?.adults) queryParams.append('adults', params.adults.toString());
    if (params?.children) queryParams.append('children', params.children.toString());
    if (params?.infants) queryParams.append('infants', params.infants.toString());
    if (params?.pets) queryParams.append('pets', params.pets.toString());
    if (params?.ignoreRobotsText) queryParams.append('ignoreRobotsText', params.ignoreRobotsText.toString());

    const url = `/airbnb/listing/${listingId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<AirbnbListingDetails>(url);
    return response.data;
  },

  /**
   * 获取可用工具列表
   * GET /api/airbnb/tools
   */
  getTools: async (): Promise<AirbnbToolsResponse> => {
    const response = await apiClient.get<AirbnbToolsResponse>('/airbnb/tools');
    return response.data;
  },

  /**
   * 检查授权状态
   * GET /api/airbnb/auth/status
   */
  getAuthStatus: async (): Promise<AirbnbAuthStatus> => {
    const response = await apiClient.get<AirbnbAuthStatus>('/airbnb/auth/status');
    return response.data;
  },

  /**
   * 获取授权 URL
   * GET /api/airbnb/auth/url
   */
  getAuthUrl: async (): Promise<AirbnbAuthUrl> => {
    const response = await apiClient.get<AirbnbAuthUrl>('/airbnb/auth/url');
    return response.data;
  },

  /**
   * 验证授权
   * POST /api/airbnb/auth/verify
   */
  verifyAuth: async (connectionId: string): Promise<AirbnbAuthVerify> => {
    const response = await apiClient.post<AirbnbAuthVerify>(
      '/airbnb/auth/verify',
      { connectionId }
    );
    return response.data;
  },
};
