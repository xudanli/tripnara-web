/**
 * 建议系统API集成测试
 * 测试API接口调用的正确性
 */

import { tripsApi } from '@/api/trips';
import type {
  SuggestionListResponse,
  SuggestionStats,
  ApplySuggestionRequest,
  ApplySuggestionResponse,
} from '@/types/suggestion';

// Mock API client
jest.mock('@/api/client', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('建议系统API集成测试', () => {
  const mockTripId = 'trip-123';
  const mockSuggestionId = 'sug-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuggestions', () => {
    it('应该正确调用获取建议列表接口', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            items: [],
            total: 0,
          } as SuggestionListResponse,
        },
      };

      const apiClient = require('@/api/client').default;
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await tripsApi.getSuggestions(mockTripId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/trips/${mockTripId}/suggestions`,
        { params: undefined }
      );
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBe(0);
    });

    it('应该正确传递过滤参数', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            items: [],
            total: 0,
          } as SuggestionListResponse,
        },
      };

      const apiClient = require('@/api/client').default;
      apiClient.get.mockResolvedValue(mockResponse);

      const params = {
        persona: 'abu' as const,
        scope: 'day' as const,
        scopeId: 'day-123',
        severity: 'blocker' as const,
        status: 'new' as const,
        limit: 20,
        offset: 0,
      };

      await tripsApi.getSuggestions(mockTripId, params);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/trips/${mockTripId}/suggestions`,
        { params }
      );
    });
  });

  describe('getSuggestionStats', () => {
    it('应该正确调用获取建议统计接口', async () => {
      const mockStats: SuggestionStats = {
        tripId: mockTripId,
        byPersona: {
          abu: { total: 2, bySeverity: { blocker: 1, warn: 1, info: 0 } },
          drdre: { total: 1, bySeverity: { blocker: 0, warn: 1, info: 0 } },
          neptune: { total: 0, bySeverity: { blocker: 0, warn: 0, info: 0 } },
        },
        byScope: {
          trip: 2,
          day: {},
          item: {},
        },
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockStats,
        },
      };

      const apiClient = require('@/api/client').default;
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await tripsApi.getSuggestionStats(mockTripId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/trips/${mockTripId}/suggestions/stats`
      );
      expect(result.tripId).toBe(mockTripId);
      expect(result.byPersona.abu.total).toBe(2);
    });
  });

  describe('applySuggestion', () => {
    it('应该正确调用应用建议接口', async () => {
      const mockRequest: ApplySuggestionRequest = {
        actionId: 'apply_alternative',
        params: { alternativeId: 'alt-001' },
        preview: false,
      };

      const mockResponse: ApplySuggestionResponse = {
        success: true,
        suggestionId: mockSuggestionId,
        appliedChanges: [
          {
            type: 'route_replacement',
            description: '已替换路线',
          },
        ],
        impact: {
          metrics: {
            fatigue: -5,
            buffer: 30,
          },
        },
      };

      const apiClient = require('@/api/client').default;
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await tripsApi.applySuggestion(
        mockTripId,
        mockSuggestionId,
        mockRequest
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        `/trips/${mockTripId}/suggestions/${mockSuggestionId}/apply`,
        mockRequest
      );
      expect(result.success).toBe(true);
      expect(result.suggestionId).toBe(mockSuggestionId);
      expect(result.appliedChanges).toHaveLength(1);
    });

    it('请求体不应该包含suggestionId', async () => {
      const mockRequest: ApplySuggestionRequest = {
        actionId: 'apply_alternative',
        params: { alternativeId: 'alt-001' },
        preview: false,
      };

      const apiClient = require('@/api/client').default;
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            success: true,
            suggestionId: mockSuggestionId,
            appliedChanges: [],
          },
        },
      });

      await tripsApi.applySuggestion(mockTripId, mockSuggestionId, mockRequest);

      const callArgs = apiClient.post.mock.calls[0];
      const requestBody = callArgs[1];

      // 验证请求体不包含suggestionId
      expect(requestBody).not.toHaveProperty('suggestionId');
      expect(requestBody).toHaveProperty('actionId');
      expect(requestBody).toHaveProperty('params');
      expect(requestBody).toHaveProperty('preview');
    });
  });

  describe('dismissSuggestion', () => {
    it('应该正确调用忽略建议接口', async () => {
      const apiClient = require('@/api/client').default;
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: null,
        },
      });

      await tripsApi.dismissSuggestion(mockTripId, mockSuggestionId);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/trips/${mockTripId}/suggestions/${mockSuggestionId}/dismiss`
      );
    });
  });
});

