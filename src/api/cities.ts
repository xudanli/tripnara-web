import apiClient from './client';

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

// ==================== 城市类型定义 ====================

export interface City {
  id: number;                    // 城市 ID
  name: string;                  // 城市名称（通用）
  countryCode: string;          // 国家代码
  nameCN?: string;               // 中文名称
  nameEN?: string;               // 英文名称
  adcode?: string;              // 行政区划代码
  timezone?: string;            // 时区，如 "Asia/Tokyo"
  lat?: number;                 // 纬度
  lng?: number;                 // 经度
  metadata?: Record<string, any>; // 扩展元数据
}

// ==================== 获取城市列表参数 ====================

export interface GetCitiesParams {
  countryCode?: string; // 国家代码过滤，如 "JP", "IS"
  q?: string; // 搜索关键词（城市名称，支持中文、英文）
  limit?: number; // 返回数量限制（默认 50）
  offset?: number; // 偏移量（用于分页，默认 0）
}

// ==================== 获取城市列表响应 ====================

export interface GetCitiesResponse {
  cities: City[];
  total: number;                 // 符合条件的总城市数
  hasMore?: boolean;             // 是否还有更多数据（用于滚动加载）
  limit?: number;                // 本次请求的limit值
  offset?: number;               // 本次请求的offset值
  countryCode?: string;          // 如果指定了国家代码，会返回规范化后的值
  totalInCountry?: number;       // 该国家的总城市数（向后兼容）
}

// ==================== 城市API ====================

export const citiesApi = {
  /**
   * 获取城市列表
   * GET /cities
   * 支持按国家代码过滤和关键词搜索，支持分页
   * 
   * @param params 查询参数
   * @returns 城市列表响应，包含 cities 数组和分页信息
   */
  getAll: async (params?: GetCitiesParams): Promise<GetCitiesResponse> => {
    // ✅ 构建参数对象，axios 的 paramsSerializer 会自动处理 URL 编码（包括中文字符）
    const requestParams: Record<string, any> = {
      limit: params?.limit || 50,
      offset: params?.offset || 0,
    };
    
    if (params?.countryCode) {
      requestParams.countryCode = params.countryCode;
    }
    
    // 添加搜索参数（如果存在），使用 encodeURIComponent 确保中文正确编码
    if (params?.q) {
      requestParams.q = encodeURIComponent(params.q);
    }
    
    const response = await apiClient.get<ApiResponseWrapper<GetCitiesResponse>>('/cities', {
      params: requestParams,
    });
    return handleResponse(response);
  },

  /**
   * 根据国家代码获取城市列表
   * GET /cities?countryCode=:countryCode
   * 
   * @param countryCode 国家代码（ISO 3166-1 alpha-2）
   * @param limit 返回数量限制（可选）
   * @param offset 偏移量（可选，用于分页）
   * @returns 城市列表响应
   */
  getByCountry: async (
    countryCode: string,
    limit?: number,
    offset?: number
  ): Promise<GetCitiesResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<GetCitiesResponse>>('/cities', {
      params: {
        countryCode,
        ...(limit && { limit }),
        ...(offset !== undefined && { offset }),
      },
    });
    return handleResponse(response);
  },

  /**
   * 搜索城市
   * GET /cities?q=:query&countryCode=:countryCode
   * 支持中文、英文搜索，不区分大小写
   * 
   * @param query 搜索关键词（支持中文名、英文名）
   * @param countryCode 国家代码（可选，用于限制搜索范围）
   * @param limit 返回数量限制（可选）
   * @returns 城市列表响应
   */
  search: async (
    query: string,
    countryCode?: string,
    limit?: number
  ): Promise<GetCitiesResponse> => {
    // ✅ 构建参数对象，使用 encodeURIComponent 确保中文搜索词正确编码
    const requestParams: Record<string, any> = {
      q: encodeURIComponent(query),
    };
    
    if (countryCode) {
      requestParams.countryCode = countryCode;
    }
    
    if (limit) {
      requestParams.limit = limit;
    }
    
    const response = await apiClient.get<ApiResponseWrapper<GetCitiesResponse>>('/cities', {
      params: requestParams,
    });
    return handleResponse(response);
  },

  /**
   * 获取城市详情
   * GET /cities/:id
   * 
   * @param id 城市 ID
   * @returns 城市详情
   */
  getById: async (id: number): Promise<City> => {
    const response = await apiClient.get<ApiResponseWrapper<City>>(`/cities/${id}`);
    return handleResponse(response);
  },
};
