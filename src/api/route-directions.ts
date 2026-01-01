import apiClient from './client';
import type {
  QueryRouteDirectionsParams,
  QueryRouteDirectionsResponse,
  GetRouteDirectionResponse,
  GetRouteDirectionCardsParams,
  GetRouteDirectionCardsResponse,
  GetRouteDirectionInteractionsParams,
  GetRouteDirectionInteractionsResponse,
  GetRouteDirectionsByCountryParams,
  GetRouteDirectionsByCountryResponse,
  QueryRouteTemplatesParams,
  QueryRouteTemplatesResponse,
  GetRouteTemplateResponse,
  UpdateRouteTemplateRequest,
  UpdateRouteTemplateResponse,
  CreateTripFromTemplateRequest,
  CreateTripFromTemplateResponse,
} from '@/types/places-routes';

// 文档中的响应格式是 { success: true, data: T }
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

// 辅助函数：处理API响应
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }

  return response.data.data;
}

export const routeDirectionsApi = {
  /**
   * 查询路线方向
   * GET /route-directions
   */
  query: async (params?: QueryRouteDirectionsParams): Promise<QueryRouteDirectionsResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<QueryRouteDirectionsResponse['data']>>(
      '/route-directions',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取路线方向详情
   * GET /route-directions/:id
   */
  getById: async (id: number): Promise<GetRouteDirectionResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetRouteDirectionResponse['data']>>(
      `/route-directions/${id}`
    );
    return handleResponse(response);
  },

  /**
   * 获取路线方向详情（通过查询参数）
   * GET /route-directions/details
   * 接口 20: 支持通过 id 或 uuid 查询，以及多种筛选条件
   */
  getDetails: async (params: {
    id?: number;
    uuid?: string;
    countryCode?: string;
    tag?: string;
    tags?: string | string[];
    isActive?: boolean;
    month?: number;
  }): Promise<GetRouteDirectionResponse['data'] | GetRouteDirectionResponse['data'][]> => {
    // 处理 tags 参数：如果是数组，转换为逗号分隔的字符串
    const queryParams: any = { ...params };
    if (Array.isArray(queryParams.tags)) {
      queryParams.tags = queryParams.tags.join(',');
    }

    const response = await apiClient.get<ApiResponseWrapper<GetRouteDirectionResponse['data'] | GetRouteDirectionResponse['data'][]>>(
      '/route-directions/details',
      { params: queryParams }
    );
    return handleResponse(response);
  },

  /**
   * 获取路线方向卡片列表
   * GET /route-directions/cards
   */
  getCards: async (params: GetRouteDirectionCardsParams): Promise<GetRouteDirectionCardsResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetRouteDirectionCardsResponse['data']>>(
      '/route-directions/cards',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取路线方向交互列表
   * GET /route-directions/interactions
   */
  getInteractions: async (
    params: GetRouteDirectionInteractionsParams
  ): Promise<GetRouteDirectionInteractionsResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetRouteDirectionInteractionsResponse['data']>>(
      '/route-directions/interactions',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 根据国家获取路线方向
   * GET /route-directions/by-country/:countryCode
   */
  getByCountry: async (
    countryCode: string,
    params?: GetRouteDirectionsByCountryParams
  ): Promise<GetRouteDirectionsByCountryResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetRouteDirectionsByCountryResponse['data']>>(
      `/route-directions/by-country/${countryCode}`,
      { params }
    );
    return handleResponse(response);
  },

  // ==================== 路线模板相关接口 ====================

  /**
   * 查询路线模板列表
   * GET /route-directions/templates
   */
  queryTemplates: async (
    params?: QueryRouteTemplatesParams
  ): Promise<QueryRouteTemplatesResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<QueryRouteTemplatesResponse['data']>>(
      '/route-directions/templates',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取路线模板详情
   * GET /route-directions/templates/:id
   */
  getTemplateById: async (id: number): Promise<GetRouteTemplateResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetRouteTemplateResponse['data']>>(
      `/route-directions/templates/${id}`
    );
    return handleResponse(response);
  },

  /**
   * 更新路线模板
   * PUT /route-directions/templates/:id
   */
  updateTemplate: async (
    id: number,
    data: UpdateRouteTemplateRequest
  ): Promise<UpdateRouteTemplateResponse['data']> => {
    const response = await apiClient.put<ApiResponseWrapper<UpdateRouteTemplateResponse['data']>>(
      `/route-directions/templates/${id}`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 使用模板创建行程
   * POST /route-directions/templates/:id/create-trip
   */
  createTripFromTemplate: async (
    templateId: number,
    data: CreateTripFromTemplateRequest
  ): Promise<CreateTripFromTemplateResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripFromTemplateResponse['data']>>(
      `/route-directions/templates/${templateId}/create-trip`,
      data
    );
    return handleResponse(response);
  },
};

