import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 文档集合类型
 */
export type CollectionType =
  | 'travel_guides'
  | 'compliance_rules'
  | 'rail_pass_rules'
  | 'trail_access_rules'
  | 'local_insights';

/**
 * RAG 检索请求参数
 */
export interface RagRetrievalRequest {
  query: string;
  collection: CollectionType;
  countryCode?: string;
  limit?: number;
  tags?: string; // 逗号分隔的标签字符串
  minScore?: number;
}

/**
 * RAG 检索结果项
 */
export interface RagRetrievalResult {
  id: string;
  title: string;
  content: string;
  source?: string;
  score: number; // 0-1，相似度分数
  metadata?: {
    author?: string;
    publishedDate?: string;
    category?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * 成功响应格式
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const ragApi = {
  /**
   * RAG 文档检索
   * GET /rag/retrieve
   * 接口 46: 使用向量检索从知识库中检索相关文档
   */
  retrieve: async (params: RagRetrievalRequest): Promise<RagRetrievalResult[]> => {
    const response = await apiClient.get<ApiResponseWrapper<RagRetrievalResult[]>>(
      '/rag/retrieve',
      { params }
    );
    return handleResponse(response);
  },
};

