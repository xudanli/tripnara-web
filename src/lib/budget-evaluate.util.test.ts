import { describe, expect, it } from 'vitest';
import {
  isDisplayableHotspot,
  mapEvaluationHotspots,
  resolveEvaluationHotspots,
} from '@/lib/budget-evaluate.util';

describe('budget-evaluate hotspots', () => {
  it('filters hollow evaluate hotspots', () => {
    const rows = mapEvaluationHotspots([
      { name: '', risk: 'medium' },
      { name: '  ', reason: '  ', risk: 'high' },
      { name: '住宿', reason: '超出结构分配', amount: 12000, risk: 'medium' },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('住宿');
  });

  it('falls back to violations when hotspots are all hollow', () => {
    const rows = resolveEvaluationHotspots(
      {
        verdict: 'NEED_ADJUST',
        reason: 'structure mismatch',
        confidence: 0.8,
        hotspots: [{ risk: 'medium' }, { risk: 'medium' }],
        violations: [
          { category: 'accommodation', exceeded: 12000, percentage: 100 },
          { category: 'transportation', exceeded: 4320, percentage: 100 },
        ],
      },
      true,
      { intentTotal: 32500, totalEstimated: 5000 },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe('住宿');
    expect(rows[0]?.reason).toContain('100');
  });

  it('skips violation hotspots when actuals fill is too low', () => {
    const rows = resolveEvaluationHotspots(
      {
        verdict: 'NEED_ADJUST',
        reason: 'structure mismatch',
        confidence: 0.8,
        violations: [{ category: 'accommodation', exceeded: 12000, percentage: 100 }],
      },
      true,
      { intentTotal: 32500, totalEstimated: 100 },
    );

    expect(rows).toHaveLength(0);
  });

  it('isDisplayableHotspot accepts name, reason, or amount', () => {
    expect(isDisplayableHotspot({ id: '1', name: 'Day 2', risk: 'low', reason: '' })).toBe(true);
    expect(
      isDisplayableHotspot({ id: '2', name: '', risk: 'low', reason: '超出日均预算' }),
    ).toBe(true);
    expect(isDisplayableHotspot({ id: '3', name: '', risk: 'low', reason: '', amount: 0 })).toBe(true);
    expect(isDisplayableHotspot({ id: '4', name: '', risk: 'medium', reason: '' })).toBe(false);
  });
});
