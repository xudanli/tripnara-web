import { describe, expect, it } from 'vitest';
import {
  buildDecisionCheckerImpactPreviewRows,
  formatRepairPlanDisplayTitle,
} from '@/lib/decision-checker-overview.util';

describe('decision-checker-overview.util', () => {
  it('prefixes repair plan title with option letter', () => {
    expect(formatRepairPlanDisplayTitle('更换 Day 2 住宿', 'A')).toBe(
      '方案 A：更换 Day 2 住宿',
    );
    expect(formatRepairPlanDisplayTitle('方案 B：绕行', 'C')).toBe('方案 B：绕行');
  });

  it('builds impact preview rows from summary and cascade', () => {
    const rows = buildDecisionCheckerImpactPreviewRows({
      summary: {
        budgetImpact: { label: '预算影响', value: '+ ¥820', tone: 'bad' },
        experienceCompletion: { value: '95%', tone: 'good' },
      },
      constraints: [],
      cascade: [
        {
          id: 'c1',
          title: '安全风险',
          description: '显著降低',
          status: 'ok',
          order: 1,
        },
      ],
    });

    expect(rows.some((row) => row.label === '安全风险')).toBe(true);
    expect(rows.some((row) => row.label === '预算影响')).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(4);
  });
});
