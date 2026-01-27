import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 发送联系消息的请求参数
 */
export interface SendMessageRequest {
  message?: string;
  images?: File[];
}

/**
 * 发送消息的响应数据
 */
export interface SendMessageResponseData {
  id: string;
  success: boolean;
  message: string;
}

/**
 * 发送消息的响应
 */
export interface SendMessageResponse {
  success: true;
  data: SendMessageResponseData;
}

// ==================== API 实现 ====================

export const contactApi = {
  /**
   * 发送联系消息
   * POST /contact/message
   */
  sendMessage: async (data: SendMessageRequest): Promise<SendMessageResponseData> => {
    try {
      // 验证：至少需要提供 message 或 images 其中一项
      if (!data.message?.trim() && (!data.images || data.images.length === 0)) {
        throw new Error('消息和图片不能同时为空');
      }

      const formData = new FormData();

      if (data.message?.trim()) {
        formData.append('message', data.message.trim());
      }

      if (data.images && data.images.length > 0) {
        // 验证图片格式和大小
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        data.images.forEach((image, index) => {
          // 验证格式
          if (!allowedTypes.includes(image.type)) {
            throw new Error(`图片 ${index + 1} 格式不支持，仅支持 jpg, jpeg, png, gif, webp`);
          }
          // 验证大小
          if (image.size > maxSize) {
            throw new Error(`图片 ${index + 1} 大小超过 5MB 限制`);
          }
          formData.append('images', image);
        });
      }

      const response = await apiClient.post<{
        success: boolean;
        data?: SendMessageResponseData;
        error?: {
          code: string;
          message: string;
        };
      }>('/contact/message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 处理响应
      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // 处理错误响应
      if (response.data.error) {
        throw new Error(response.data.error.message || '发送消息失败');
      }

      throw new Error('未知的响应格式');
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }

      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          throw new Error(errorData.error.message || errorData.error.code || '发送消息失败');
        }
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      }

      // 如果已经有错误消息，直接抛出
      if (error.message) {
        throw error;
      }

      // 处理其他错误
      throw new Error('发送消息失败，请稍后重试');
    }
  },
};

