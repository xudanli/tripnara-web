/**
 * suggestionStats 测试
 * 验证建议统计计算逻辑
 */

import { calculateSuggestionStats } from '../suggestionStats';
import type { Suggestion } from '@/types/suggestion';

describe('suggestionStats', () => {
  const mockTripId = 'trip-123';

  const createMockSuggestion = (overrides: Partial<Suggestion>): Suggestion => ({
    id: 'sug-001',
    persona: 'abu',
    scope: 'trip',
    scopeId: mockTripId,
    severity: 'warn',
    status: 'new',
    title: 'Test Suggestion',
    summary: 'Test summary',
    actions: [],
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  describe('calculateSuggestionStats', () => {
    it('应该正确计算三人格的统计', () => {
      const suggestions: Suggestion[] = [
        createMockSuggestion({ id: 'sug-1', persona: 'abu', severity: 'blocker' }),
        createMockSuggestion({ id: 'sug-2', persona: 'abu', severity: 'warn' }),
        createMockSuggestion({ id: 'sug-3', persona: 'drdre', severity: 'warn' }),
        createMockSuggestion({ id: 'sug-4', persona: 'neptune', severity: 'info' }),
      ];

      const stats = calculateSuggestionStats(suggestions, mockTripId);

      expect(stats.tripId).toBe(mockTripId);
      expect(stats.byPersona.abu.total).toBe(2);
      expect(stats.byPersona.abu.bySeverity.blocker).toBe(1);
      expect(stats.byPersona.abu.bySeverity.warn).toBe(1);
      expect(stats.byPersona.drdre.total).toBe(1);
      expect(stats.byPersona.neptune.total).toBe(1);
    });

    it('应该正确计算作用范围统计', () => {
      const dayId1 = 'day-001';
      const dayId2 = 'day-002';
      const itemId1 = 'item-001';

      const suggestions: Suggestion[] = [
        createMockSuggestion({ id: 'sug-1', scope: 'trip' }),
        createMockSuggestion({ id: 'sug-2', scope: 'day', scopeId: dayId1 }),
        createMockSuggestion({ id: 'sug-3', scope: 'day', scopeId: dayId1 }),
        createMockSuggestion({ id: 'sug-4', scope: 'day', scopeId: dayId2 }),
        createMockSuggestion({ id: 'sug-5', scope: 'item', scopeId: itemId1 }),
      ];

      const stats = calculateSuggestionStats(suggestions, mockTripId);

      expect(stats.byScope.trip).toBe(1);
      expect(stats.byScope.day[dayId1]).toBe(2);
      expect(stats.byScope.day[dayId2]).toBe(1);
      expect(stats.byScope.item[itemId1]).toBe(1);
    });

    it('应该处理空数组', () => {
      const stats = calculateSuggestionStats([], mockTripId);

      expect(stats.tripId).toBe(mockTripId);
      expect(stats.byPersona.abu.total).toBe(0);
      expect(stats.byPersona.drdre.total).toBe(0);
      expect(stats.byPersona.neptune.total).toBe(0);
      expect(stats.byScope.trip).toBe(0);
      expect(Object.keys(stats.byScope.day)).toHaveLength(0);
      expect(Object.keys(stats.byScope.item)).toHaveLength(0);
    });

    it('应该正确统计所有严重级别', () => {
      const suggestions: Suggestion[] = [
        createMockSuggestion({ id: 'sug-1', persona: 'abu', severity: 'blocker' }),
        createMockSuggestion({ id: 'sug-2', persona: 'abu', severity: 'blocker' }),
        createMockSuggestion({ id: 'sug-3', persona: 'abu', severity: 'warn' }),
        createMockSuggestion({ id: 'sug-4', persona: 'abu', severity: 'info' }),
        createMockSuggestion({ id: 'sug-5', persona: 'abu', severity: 'info' }),
      ];

      const stats = calculateSuggestionStats(suggestions, mockTripId);

      expect(stats.byPersona.abu.total).toBe(5);
      expect(stats.byPersona.abu.bySeverity.blocker).toBe(2);
      expect(stats.byPersona.abu.bySeverity.warn).toBe(1);
      expect(stats.byPersona.abu.bySeverity.info).toBe(2);
    });
  });
});

