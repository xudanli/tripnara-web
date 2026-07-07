import { describe, expect, it } from 'vitest';
import {
  formatDecisionCheckerEvidenceItem,
  isPlanObjectEvidenceItem,
  isTechnicalEvidenceLabel,
  resolvePlanObjectEvidenceLabel,
} from '@/lib/decision-checker-evidence-display.util';

describe('decision-checker-evidence-display.util', () => {
  it('detects plan_object semantic keys as technical labels', () => {
    expect(
      isTechnicalEvidenceLabel(
        'plan_object_meal_late_arrival_po_0ba4cb61-1443-4f18-ac4a-c07ced294760_meal_window_policy',
      ),
    ).toBe(true);
    expect(isTechnicalEvidenceLabel('预计 钻石沙滩 结束于 13:50，晚于午餐窗 12:00')).toBe(false);
  });

  it('resolves meal_late_arrival semantic slug', () => {
    expect(
      resolvePlanObjectEvidenceLabel(
        'plan_object_meal_late_arrival_po_0ba4cb61-1443-4f18-ac4a-c07ced294760_meal_window_policy',
      ),
    ).toBe('游览结束晚于午餐窗');
  });

  it('promotes human subtitle when title is technical', () => {
    const formatted = formatDecisionCheckerEvidenceItem({
      id: 'plan_object_meal_late_arrival_po_0ba4cb61_meal_window_policy',
      kind: 'other',
      title:
        'plan_object_meal_late_arrival_po_0ba4cb61-1443-4f18-ac4a-c07ced294760_meal_window_policy',
      subtitle: '预计 钻石沙滩 结束于 13:50，晚于午餐窗 12:00',
      reliability: 'low',
    });

    expect(formatted.title).toBe('预计 钻石沙滩 结束于 13:50，晚于午餐窗 12:00');
    expect(formatted.subtitle).toBe('依据：游览结束晚于午餐窗');
  });

  it('falls back to category label when subtitle is also technical', () => {
    const formatted = formatDecisionCheckerEvidenceItem({
      id: 'plan_object_transfer_buffer',
      kind: 'other',
      title: 'plan_object_transfer_buffer',
      subtitle: '',
      reliability: 'medium',
    });

    expect(formatted.title).toBe('转场缓冲偏紧');
  });

  it('detects plan object evidence via refs and preserves BFF title/subtitle', () => {
    const formatted = formatDecisionCheckerEvidenceItem({
      id: 'ev_meal_late_1',
      kind: 'other',
      title: '预计 钻石沙滩 结束于 13:50，晚于午餐窗 12:00',
      subtitle: '依据：游览结束晚于午餐窗',
      reliability: 'low',
      refs: [
        { type: 'semantic_key', id: 'plan_object_meal_late_arrival_po_0ba4cb61_meal_window_policy' },
        { type: 'plan_object_rule', id: 'MEAL_WINDOW_VS_ARRIVAL' },
      ],
    });

    expect(formatted.title).toBe('预计 钻石沙滩 结束于 13:50，晚于午餐窗 12:00');
    expect(formatted.subtitle).toBe('依据：游览结束晚于午餐窗');
    expect(isPlanObjectEvidenceItem(formatted)).toBe(true);
  });

  it('fills subtitle from plan_object_rule ref when BFF omits subtitle', () => {
    const formatted = formatDecisionCheckerEvidenceItem({
      id: 'ev_1',
      kind: 'other',
      title: '预计 斯科加瀑布 结束偏晚',
      subtitle: '',
      reliability: 'low',
      refs: [{ type: 'plan_object_rule', id: 'MEAL_WINDOW_VS_ARRIVAL' }],
    });

    expect(formatted.subtitle).toBe('依据：游览结束晚于午餐窗');
  });
});
