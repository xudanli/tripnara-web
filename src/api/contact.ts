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
 * 发送消息的响应
 */
export interface SendMessageResponse {
  success: boolean;
  message: string;
  id?: string;
}

// ==================== API 实现 ====================

export const contactApi = {
  /**
   * 发送联系消息
   * POST /contact/message
   */
  sendMessage: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    try {
      const formData = new FormData();

      if (data.message) {
        formData.append('message', data.message);
      }

      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append(`images`, image);
        });
      }

      const response = await apiClient.post<SendMessageResponse>('/contact/message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }

      // 处理后端错误响应
      if (error.response?.data) {
        const errorMessage =
          error.response.data.message || error.response.data.error || '发送消息失败';
        throw new Error(errorMessage);
      }

      // 处理其他错误
      throw new Error(error.message || '发送消息失败，请稍后重试');
    }
  },
};

