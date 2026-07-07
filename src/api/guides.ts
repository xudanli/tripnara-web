/**
 * Guide-to-Plan Pipeline API
 *
 * POST /guides/parse       — 单篇攻略解析
 * POST /guides/merge       — 多篇合并理解
 * POST /guides/generate-draft — 生成行程草案
 *
 * 后端未就绪时自动降级到客户端 mock（仅开发演示，非生产解析）。
 */

import apiClient from './client';
import type {
  GenerateGuideDraftRequest,
  GenerateGuideDraftResponse,
  MergeGuidesRequest,
  MergeGuidesResponse,
  ParseGuideRequest,
  ParseGuideResponse,
} from '@/types/guide-import';
import {
  mockGenerateDraft,
  mockMergeGuides,
  mockParseGuide,
} from '@/lib/guide-import-mock';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data?.success) {
    const msg = !response?.data?.success ? response.data.error?.message : '请求失败';
    throw new Error(msg || '请求失败');
  }
  return response.data.data;
}

function isEndpointMissing(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 404 || status === 501;
  }
  const msg = err instanceof Error ? err.message : '';
  return /404|501|ENOTFOUND|Network Error/i.test(msg);
}

export const guidesApi = {
  /**
   * 解析单篇攻略
   * POST /guides/parse
   */
  parse: async (data: ParseGuideRequest): Promise<ParseGuideResponse> => {
    try {
      if (data.source.type === 'screenshot' || data.source.type === 'file') {
        const formData = new FormData();
        formData.append('sourceType', data.source.type);
        formData.append('locale', data.locale ?? 'zh-CN');
        if (data.source.rawText) formData.append('rawText', data.source.rawText);
        if (data.source.url) formData.append('url', data.source.url);
        const response = await apiClient.post<ApiResponseWrapper<ParseGuideResponse>>(
          '/guides/parse',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
          },
        );
        return handleResponse(response);
      }

      const response = await apiClient.post<ApiResponseWrapper<ParseGuideResponse>>(
        '/guides/parse',
        data,
        { timeout: 120000 },
      );
      return handleResponse(response);
    } catch (err) {
      if (isEndpointMissing(err)) {
        console.warn('[guidesApi] /guides/parse 不可用，使用客户端 mock');
        return { guide: mockParseGuide(data.source) };
      }
      throw err;
    }
  },

  /**
   * 合并多篇攻略理解结果
   * POST /guides/merge
   */
  merge: async (data: MergeGuidesRequest): Promise<MergeGuidesResponse> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<MergeGuidesResponse>>(
        '/guides/merge',
        data,
        { timeout: 60000 },
      );
      return handleResponse(response);
    } catch (err) {
      if (isEndpointMissing(err)) {
        console.warn('[guidesApi] /guides/merge 不可用，使用客户端 mock');
        return { summary: mockMergeGuides(data.guides) };
      }
      throw err;
    }
  },

  /**
   * 生成行程草案（不直接等同于可执行计划）
   * POST /guides/generate-draft
   */
  generateDraft: async (
    data: GenerateGuideDraftRequest,
  ): Promise<GenerateGuideDraftResponse> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<GenerateGuideDraftResponse>>(
        '/guides/generate-draft',
        data,
        { timeout: 180000 },
      );
      return handleResponse(response);
    } catch (err) {
      if (isEndpointMissing(err)) {
        console.warn('[guidesApi] /guides/generate-draft 不可用，使用客户端 mock');
        return {
          candidate: mockGenerateDraft(data.summary, data.tripContext, data.guideIds),
        };
      }
      throw err;
    }
  },
};
