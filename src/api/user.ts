import apiClient from './client';

/**
 * 用户偏好接口文档位置: docs/api/user-preferences.md
 */

// ==================== 类型定义 ====================

/**
 * 用户偏好配置
 */
export interface UserPreferences {
  nationality?: string; // ISO 3166-1 alpha-2，如 "CN"
  residencyCountry?: string; // ISO 3166-1 alpha-2，如 "CN"
  tags?: string[]; // 旅行者标签，如 ["senior", "family_with_children", "solo", "adventure", "photography"]
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
 * 用户基本信息
 */
export interface User {
  id: string;
  email: string | null;
  emailVerified: boolean | null;
  displayName: string | null;
  avatarUrl: string | null;
  googleSub: string | null;
  createdAt: string;
  updatedAt: string;
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
 * 获取当前用户信息响应
 */
export type GetUserMeResponse = SuccessResponse<User>;

/**
 * 更新当前用户信息请求体
 */
export interface UpdateUserMeRequest {
  displayName?: string;
  avatarUrl?: string;
}

/**
 * 更新当前用户信息响应
 */
export type UpdateUserMeResponse = SuccessResponse<User>;

/**
 * 删除当前用户账户请求体
 */
export interface DeleteUserMeRequest {
  confirmText: string; // 必须为 "确认删除"
}

/**
 * 删除当前用户账户响应
 */
export interface DeleteUserMeResponse {
  deleted: boolean;
  userId: string;
  deletedAt: string;
}

/**
 * 删除用户响应（统一响应格式）
 */
export type DeleteUserMeResponseWrapper = SuccessResponse<DeleteUserMeResponse>;

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

/**
 * 用户信息 API 错误类
 */
export class UserApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

// ==================== API 实现 ====================

export const userApi = {
  /**
   * 获取当前用户信息
   * GET /users/me
   */
  getMe: async (): Promise<User> => {
    try {
      const response = await apiClient.get<GetUserMeResponse>('/users/me');
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        // 防御性检查：确保 error 对象存在
        if (errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '获取用户信息失败'
          );
        } else {
          throw new UserApiError(
            'UNKNOWN_ERROR',
            '获取用户信息失败：服务器返回了无效的错误格式'
          );
        }
      }
      
      // 防御性检查：确保返回的数据存在
      if (!response.data.data) {
        throw new UserApiError(
          'INVALID_RESPONSE',
          '获取用户信息失败：服务器返回的数据为空'
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
        throw new UserApiError(
          'UNAUTHORIZED',
          '未认证，请重新登录'
        );
      }
      
      // 处理 404 用户不存在
      if (error.response?.status === 404) {
        throw new UserApiError(
          'NOT_FOUND',
          '用户不存在'
        );
      }
      
      // 处理已定义的 API 错误
      if (error instanceof UserApiError) {
        throw error;
      }
      
      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '获取用户信息失败'
          );
        }
      }
      
      // 处理其他错误
      throw new Error(error.message || '获取用户信息失败，请稍后重试');
    }
  },

  /**
   * 更新当前用户信息
   * PUT /users/me
   */
  updateMe: async (data: UpdateUserMeRequest): Promise<User> => {
    try {
      const response = await apiClient.put<UpdateUserMeResponse>(
        '/users/me',
        data
      );
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        // 防御性检查：确保 error 对象存在
        if (errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '更新用户信息失败'
          );
        } else {
          throw new UserApiError(
            'UNKNOWN_ERROR',
            '更新用户信息失败：服务器返回了无效的错误格式'
          );
        }
      }
      
      // 防御性检查：确保返回的数据存在
      if (!response.data.data) {
        throw new UserApiError(
          'INVALID_RESPONSE',
          '更新用户信息失败：服务器返回的数据为空'
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
        throw new UserApiError(
          'UNAUTHORIZED',
          '未认证，请重新登录'
        );
      }
      
      // 处理 404 用户不存在
      if (error.response?.status === 404) {
        throw new UserApiError(
          'NOT_FOUND',
          '用户不存在'
        );
      }
      
      // 处理验证错误
      if (error.response?.status === 400 || error.response?.status === 422) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           '请求参数验证失败';
        throw new UserApiError('VALIDATION_ERROR', errorMessage);
      }
      
      // 处理已定义的 API 错误
      if (error instanceof UserApiError) {
        throw error;
      }
      
      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '更新用户信息失败'
          );
        }
      }
      
      // 处理其他错误
      throw new Error(error.message || '更新用户信息失败，请稍后重试');
    }
  },

  /**
   * 删除当前用户账户
   * DELETE /users/me
   * 
   * ⚠️ 危险操作：此操作会永久删除用户账户及其所有关联数据，不可撤销！
   */
  deleteMe: async (confirmText: string = '确认删除'): Promise<DeleteUserMeResponse> => {
    try {
      const requestBody: DeleteUserMeRequest = {
        confirmText,
      };
      
      // Axios delete 方法通过 config.data 传递请求体
      const response = await apiClient.delete<DeleteUserMeResponseWrapper>(
        '/users/me',
        { data: requestBody }
      );
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        // 防御性检查：确保 error 对象存在
        if (errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '删除用户账户失败'
          );
        } else {
          throw new UserApiError(
            'UNKNOWN_ERROR',
            '删除用户账户失败：服务器返回了无效的错误格式'
          );
        }
      }
      
      // 防御性检查：确保返回的数据存在
      if (!response.data.data) {
        throw new UserApiError(
          'INVALID_RESPONSE',
          '删除用户账户失败：服务器返回的数据为空'
        );
      }
      
      return response.data.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      
      // 处理 400 错误（未确认删除操作）
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           '请确认删除操作';
        throw new UserApiError('VALIDATION_ERROR', errorMessage);
      }
      
      // 处理 401 未认证错误
      if (error.response?.status === 401) {
        throw new UserApiError(
          'UNAUTHORIZED',
          '未认证，请重新登录'
        );
      }
      
      // 处理 404 用户不存在
      if (error.response?.status === 404) {
        throw new UserApiError(
          'NOT_FOUND',
          '用户不存在'
        );
      }
      
      // 处理已定义的 API 错误
      if (error instanceof UserApiError) {
        throw error;
      }
      
      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData?.error) {
          throw new UserApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '删除用户账户失败'
          );
        }
      }
      
      // 处理其他错误
      throw new Error(error.message || '删除用户账户失败，请稍后重试');
    }
  },

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
        // 防御性检查：确保 error 对象存在
        if (errorData?.error) {
          throw new UserProfileApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '获取用户偏好失败'
          );
        } else {
          throw new UserProfileApiError(
            'UNKNOWN_ERROR',
            '获取用户偏好失败：服务器返回了无效的错误格式'
          );
        }
      }
      
      // 防御性检查：确保返回的数据存在
      if (!response.data.data) {
        throw new UserProfileApiError(
          'INVALID_RESPONSE',
          '获取用户偏好失败：服务器返回的数据为空'
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
        if (!errorData.success && errorData?.error) {
          throw new UserProfileApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '获取用户偏好失败'
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
        // 防御性检查：确保 error 对象存在
        if (errorData?.error) {
          throw new UserProfileApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '更新用户偏好失败'
          );
        } else {
          throw new UserProfileApiError(
            'UNKNOWN_ERROR',
            '更新用户偏好失败：服务器返回了无效的错误格式'
          );
        }
      }
      
      // 防御性检查：确保返回的数据存在
      if (!response.data.data) {
        throw new UserProfileApiError(
          'INVALID_RESPONSE',
          '更新用户偏好失败：服务器返回的数据为空'
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
        if (!errorData.success && errorData?.error) {
          throw new UserProfileApiError(
            errorData.error.code || 'UNKNOWN_ERROR',
            errorData.error.message || '更新用户偏好失败'
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

