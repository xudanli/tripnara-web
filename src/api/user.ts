import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 用户偏好配置
 */
export interface UserPreferences {
  preferredAttractionTypes?: string[];
  dietaryRestrictions?: string[];
  preferOffbeatAttractions?: boolean;
  travelPreferences?: {
    pace?: 'LEISURE' | 'MODERATE' | 'FAST';
    budget?: 'LOW' | 'MEDIUM' | 'HIGH';
    accommodation?: 'BUDGET' | 'COMFORTABLE' | 'LUXURY';
  };
  other?: Record<string, any>;
}

/**
 * 用户画像响应数据
 */
export interface UserProfile {
  userId: string;
  preferences?: UserPreferences; // 根据接口文档，preferences 可能是 undefined
  createdAt: string;
  updatedAt: string;
}

/**
 * 成功响应格式
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * 错误响应格式
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'INTERNAL_ERROR' | string;
    message: string;
  };
}

/**
 * 获取用户画像响应
 */
export type GetUserProfileResponse = SuccessResponse<UserProfile>;

/**
 * 更新用户偏好请求体
 */
export interface UpdateUserProfileRequest {
  preferences?: UserPreferences;
}

/**
 * 更新用户画像响应
 */
export type UpdateUserProfileResponse = SuccessResponse<UserProfile>;

/**
 * API 错误类
 */
export class UserProfileApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'UserProfileApiError';
  }
}

// ==================== API 实现 ====================

export const userApi = {
  /**
   * 获取当前用户的偏好画像
   * GET /users/profile
   */
  getProfile: async (): Promise<UserProfile> => {
    try {
      const response = await apiClient.get<GetUserProfileResponse>('/users/profile');
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        throw new UserProfileApiError(
          errorData.error.code,
          errorData.error.message
        );
      }
      
      return response.data.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      
      // 处理 401 未认证错误
      if (error.response?.status === 401) {
        throw new UserProfileApiError(
          'UNAUTHORIZED',
          '未认证，请重新登录'
        );
      }
      
      // 处理已定义的 API 错误
      if (error instanceof UserProfileApiError) {
        throw error;
      }
      
      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData.error) {
          throw new UserProfileApiError(
            errorData.error.code,
            errorData.error.message
          );
        }
      }
      
      // 处理其他错误
      throw new Error(error.message || '获取用户偏好失败，请稍后重试');
    }
  },

  /**
   * 更新用户偏好信息
   * PUT /users/profile
   */
  updateProfile: async (
    preferences: UserPreferences
  ): Promise<UserProfile> => {
    try {
      const requestBody: UpdateUserProfileRequest = {
        preferences,
      };
      
      const response = await apiClient.put<UpdateUserProfileResponse>(
        '/users/profile',
        requestBody
      );
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        throw new UserProfileApiError(
          errorData.error.code,
          errorData.error.message
        );
      }
      
      return response.data.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      
      // 处理 401 未认证错误
      if (error.response?.status === 401) {
        throw new UserProfileApiError(
          'UNAUTHORIZED',
          '未认证，请重新登录'
        );
      }
      
      // 处理已定义的 API 错误
      if (error instanceof UserProfileApiError) {
        throw error;
      }
      
      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData.error) {
          throw new UserProfileApiError(
            errorData.error.code,
            errorData.error.message
          );
        }
      }
      
      // 处理验证错误
      if (error.response?.status === 400 || error.response?.status === 422) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           '请求参数验证失败';
        throw new UserProfileApiError('VALIDATION_ERROR', errorMessage);
      }
      
      // 处理其他错误
      throw new Error(error.message || '更新用户偏好失败，请稍后重试');
    }
  },
};

