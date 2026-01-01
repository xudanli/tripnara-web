import apiClient from './client';
import type {
  Country,
  CurrencyStrategy,
  CountryPack,
  PaymentInfo,
  TerrainAdvice,
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

export const countriesApi = {
  /**
   * 获取所有国家列表
   * GET /countries
   */
  getAll: async (): Promise<Country[]> => {
    const response = await apiClient.get<ApiResponseWrapper<Country[]>>('/countries');
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
};


