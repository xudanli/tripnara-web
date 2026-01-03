/**
 * suggestionConverter 测试
 * 验证 PersonaAlert 到 Suggestion 的转换逻辑
 */

import { personaAlertToSuggestion, convertPersonaAlertsToSuggestions } from '../suggestionConverter';
import type { PersonaAlert } from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';

describe('suggestionConverter', () => {
  const mockTripId = 'trip-123';

  const mockPersonaAlert: PersonaAlert = {
    id: 'alert-001',
    persona: 'ABU',
    name: 'Abu',
    title: '高风险路段检测',
    message: '发现Day 2包含夜间徒步，存在安全隐患',
    severity: 'warning',
    createdAt: '2024-01-15T10:00:00Z',
    metadata: {
      decisionSource: 'PHYSICAL',
      action: 'REJECT',
      reasonCodes: ['NIGHT_TRAVEL', 'HIGH_RISK'],
    },
  };

  describe('personaAlertToSuggestion', () => {
    it('应该正确转换ABU类型的PersonaAlert', () => {
      const result = personaAlertToSuggestion(mockPersonaAlert, mockTripId);

      expect(result.id).toBe('alert-001');
      expect(result.persona).toBe('abu');
      expect(result.scope).toBe('trip');
      expect(result.scopeId).toBe(mockTripId);
      expect(result.severity).toBe('warn');
      expect(result.status).toBe('new');
      expect(result.title).toBe('高风险路段检测');
      expect(result.summary).toBe('发现Day 2包含夜间徒步，存在安全隐患');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('view_evidence');
    });

    it('应该正确转换DR_DRE类型的PersonaAlert', () => {
      const alert: PersonaAlert = {
        ...mockPersonaAlert,
        persona: 'DR_DRE',
        name: 'Dr.Dre',
        severity: 'info',
      };

      const result = personaAlertToSuggestion(alert, mockTripId);

      expect(result.persona).toBe('drdre');
      expect(result.severity).toBe('info');
    });

    it('应该正确转换NEPTUNE类型的PersonaAlert', () => {
      const alert: PersonaAlert = {
        ...mockPersonaAlert,
        persona: 'NEPTUNE',
        name: 'Neptune',
      };

      const result = personaAlertToSuggestion(alert, mockTripId);

      expect(result.persona).toBe('neptune');
    });

    it('应该处理不同的严重级别', () => {
      const testCases: Array<{ severity: PersonaAlert['severity']; expected: 'info' | 'warn' | 'blocker' }> = [
        { severity: 'success', expected: 'info' },
        { severity: 'info', expected: 'info' },
        { severity: 'warning', expected: 'warn' },
      ];

      testCases.forEach(({ severity, expected }) => {
        const alert: PersonaAlert = { ...mockPersonaAlert, severity };
        const result = personaAlertToSuggestion(alert, mockTripId);
        expect(result.severity).toBe(expected);
      });
    });

    it('应该保留metadata信息', () => {
      const result = personaAlertToSuggestion(mockPersonaAlert, mockTripId);

      expect(result.metadata?.decisionSource).toBe('PHYSICAL');
      expect(result.metadata?.action).toBe('REJECT');
      expect(result.metadata?.reasonCodes).toEqual(['NIGHT_TRAVEL', 'HIGH_RISK']);
    });
  });

  describe('convertPersonaAlertsToSuggestions', () => {
    it('应该批量转换多个PersonaAlert', () => {
      const alerts: PersonaAlert[] = [
        mockPersonaAlert,
        {
          ...mockPersonaAlert,
          id: 'alert-002',
          persona: 'DR_DRE',
          title: '节奏偏紧',
          message: 'Day 3的行程过于紧凑，建议增加缓冲时间',
        },
        {
          ...mockPersonaAlert,
          id: 'alert-003',
          persona: 'NEPTUNE',
          title: 'POI闭馆',
          message: '某景点今天闭馆，建议替换',
        },
      ];

      const results = convertPersonaAlertsToSuggestions(alerts, mockTripId);

      expect(results).toHaveLength(3);
      expect(results[0].persona).toBe('abu');
      expect(results[1].persona).toBe('drdre');
      expect(results[2].persona).toBe('neptune');
    });

    it('应该处理空数组', () => {
      const results = convertPersonaAlertsToSuggestions([], mockTripId);
      expect(results).toHaveLength(0);
    });
  });
});

