import apiClient from './client';
import type {
  Country,
  CurrencyStrategy,
  CountryPack,
  PaymentInfo,
  TerrainAdvice,
  CountryProfile,
} from '@/types/country';

// 统一响应格式
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
    details?: any;
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

// ==================== 获取国家列表参数 ====================

export interface GetCountriesParams {
  q?: string; // 搜索关键词（支持中文名、英文名、国家代码 isoCode，如 "CN"、"JP"、"US"）
  limit?: number; // 返回数量限制（默认 100，最大 500）
  offset?: number; // 偏移量（用于分页，默认 0）
}

// ==================== 获取国家列表响应 ====================

export interface GetCountriesResponse {
  countries: Country[];
  total: number; // 符合条件的总国家数
  hasMore?: boolean; // 是否还有更多数据（用于滚动加载）
  limit?: number; // 本次请求的limit值
  offset?: number; // 本次请求的offset值
}

export const countriesApi = {
  /**
   * 获取所有国家列表
   * GET /countries
   * 支持按关键词搜索和分页
   * 
   * 搜索支持：
   * - 中文名称（nameCN）：如 "中国"、"日本"
   * - 英文名称（nameEN）：如 "China"、"Japan"
   * - 国家代码（isoCode）：如 "CN"、"JP"、"US"（不区分大小写）
   * 
   * @param params 查询参数（可选）
   * @returns 国家列表响应，包含 countries 数组和分页信息
   */
  getAll: async (params?: GetCountriesParams): Promise<GetCountriesResponse> => {
    // ✅ 构建参数对象，axios 的 paramsSerializer 会自动处理 URL 编码（包括中文字符）
    // axios 使用 URLSearchParams 序列化参数，会自动对中文和特殊字符进行编码
    const requestParams: Record<string, any> = {};
    
    // ✅ 默认不传 limit，让后端返回所有国家
    // 只有在明确指定 limit 时才传递
    if (params?.limit !== undefined) {
      requestParams.limit = params.limit;
    }
    
    // 只有在明确指定 offset 时才传递（默认从0开始）
    if (params?.offset !== undefined && params.offset > 0) {
      requestParams.offset = params.offset;
    }
    
    // 添加搜索参数（如果存在）
    if (params?.q) {
      // ✅ 对于纯字母数字字符串（如国家代码 "SJ"、"CN"），不需要编码
      // 但对于包含中文或特殊字符的字符串，需要编码
      // 检查是否包含需要编码的字符
      const needsEncoding = /[^\w\s-]/.test(params.q);
      requestParams.q = needsEncoding ? encodeURIComponent(params.q) : params.q;
      
      // 调试日志：记录搜索参数
      console.log('[Countries API] 搜索参数:', {
        original: params.q,
        encoded: requestParams.q,
        needsEncoding,
      });
    }
    
    const response = await apiClient.get<ApiResponseWrapper<GetCountriesResponse>>('/countries', {
      params: requestParams,
    });
    return handleResponse(response);
  },

  /**
   * 获取国家的货币策略
   * GET /countries/:countryCode/currency-strategy
   */
  getCurrencyStrategy: async (countryCode: string): Promise<CurrencyStrategy> => {
    const response = await apiClient.get<ApiResponseWrapper<CurrencyStrategy>>(
      `/countries/${countryCode}/currency-strategy`
    );
    return handleResponse(response);
  },

  /**
   * 获取国家 Pack 配置
   * GET /countries/:countryCode/pack
   */
  getPack: async (countryCode: string): Promise<CountryPack> => {
    const response = await apiClient.get<ApiResponseWrapper<CountryPack>>(
      `/countries/${countryCode}/pack`
    );
    return handleResponse(response);
  },

  /**
   * 获取所有国家 Pack 配置列表
   * GET /countries/packs
   */
  getAllPacks: async (): Promise<CountryPack[]> => {
    const response = await apiClient.get<ApiResponseWrapper<CountryPack[]>>('/countries/packs');
    return handleResponse(response);
  },

  /**
   * 创建或更新国家 Pack 配置
   * PUT /countries/:countryCode/pack
   * 注意：目前配置通过文件管理，此接口会提示需要手动修改配置文件
   */
  updatePack: async (
    countryCode: string,
    data: Omit<CountryPack, 'countryCode'>
  ): Promise<CountryPack> => {
    const response = await apiClient.put<ApiResponseWrapper<CountryPack>>(
      `/countries/${countryCode}/pack`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取目的地支付实用信息
   * GET /countries/:countryCode/payment-info
   */
  getPaymentInfo: async (countryCode: string): Promise<PaymentInfo> => {
    const response = await apiClient.get<ApiResponseWrapper<PaymentInfo>>(
      `/countries/${countryCode}/payment-info`
    );
    return handleResponse(response);
  },

  /**
   * 获取目的地地形适配建议
   * GET /countries/:countryCode/terrain-advice
   */
  getTerrainAdvice: async (countryCode: string): Promise<TerrainAdvice> => {
    const response = await apiClient.get<ApiResponseWrapper<TerrainAdvice>>(
      `/countries/${countryCode}/terrain-advice`
    );
    return handleResponse(response);
  },

  /**
   * 获取完整的国家档案信息
   * GET /countries/:countryCode/profile
   * 
   * 返回所有字段，包括：
   * - 基础字段（isoCode, nameCN, nameEN, updatedAt）
   * - 货币和支付字段（currencyCode, currencyName, exchangeRateToCNY, exchangeRateToUSD, paymentType, paymentInfo）
   * - JSON字段（powerInfo, emergency, visaForCN, complianceInfo, travelCulture）
   * 
   * @param countryCode 国家代码（ISO 3166-1 alpha-2），例如：JP, CN, US
   * @returns 完整的国家档案信息
   */
  getCountryProfile: async (countryCode: string): Promise<CountryProfile> => {
    const response = await apiClient.get<ApiResponseWrapper<CountryProfile>>(
      `/countries/${countryCode}/profile`
    );
    return handleResponse(response);
  },
};


