import { describe, expect, it } from 'vitest';
import { Car } from 'lucide-react';
import type { WorkbenchTimelineEntry } from '@/components/plan-studio/workbench/useWorkbenchItineraryData';
import {
  attachTimelineEntryImpacts,
  buildWorkbenchDayContextSummary,
  filterConflictLinesNotOnTimeline,
  resolveTimelineEntryImpact,
} from '@/lib/workbench-timeline-impact.util';

const entry = (partial: Partial<WorkbenchTimelineEntry> & Pick<WorkbenchTimelineEntry, 'id' | 'title'>): WorkbenchTimelineEntry => ({
  timeLabel: '09:00',
  icon: Car,
  ...partial,
});

describe('resolveTimelineEntryImpact', () => {
  it('matches cascade hint by entity label', () => {
    const impact = resolveTimelineEntryImpact(entry({ id: '1', title: '黑沙滩' }), {
      cascadeHints: [
        {
          id: 'wind',
          riskLevel: 'HIGH',
          message: 'Day 4 下午风速偏高，可能延长到达时间',
          recommendation: 'ADJUST',
          entityLabel: '黑沙滩',
        },
      ],
    });
    expect(impact?.conclusion).toContain('风速');
  });

  it('matches conflict line by title token', () => {
    const impact = resolveTimelineEntryImpact(entry({ id: '2', title: '蓝湖' }), {
      conflictLines: [
        {
          id: 'c1',
          icon: Car,
          label: '交通缓冲偏紧',
          detail: '蓝湖到下一站的驾驶时间偏紧',
        },
      ],
    });
    expect(impact?.conclusion).toBe('交通缓冲偏紧');
  });
});

describe('attachTimelineEntryImpacts', () => {
  it('attaches impact to matching timeline rows only', () => {
    const rows = attachTimelineEntryImpacts(
      [
        entry({ id: '1', title: '黑沙滩' }),
        entry({ id: '2', title: '斯科加瀑布' }),
      ],
      {
        cascadeHints: [
          {
            id: 'wind',
            riskLevel: 'HIGH',
            message: '强侧风可能增加 25—40 分钟',
            recommendation: 'ADJUST',
            entityLabel: '黑沙滩',
            netImpactMinutes: 30,
          },
        ],
      },
    );
    expect(rows[0]?.impact?.reason).toContain('30');
    expect(rows[1]?.impact).toBeNull();
  });
});

describe('buildWorkbenchDayContextSummary', () => {
  it('returns null when the day has no issues', () => {
    expect(
      buildWorkbenchDayContextSummary({
        executable: true,
        conflictLines: [],
        decisionProblems: [],
        cascadeHints: [],
      }),
    ).toBeNull();
  });

  it('builds day context headline and reasons when issues exist', () => {
    const summary = buildWorkbenchDayContextSummary({
      executable: true,
      conflictLines: [
        { id: 'c1', icon: Car, label: '交通缓冲偏紧', detail: '建议提前 40 分钟出发' },
      ],
      decisionProblems: [],
      cascadeHints: [
        {
          id: 'wind',
          riskLevel: 'HIGH',
          message: '下午风速上升',
          recommendation: 'ADJUST',
        },
      ],
    });
    expect(summary?.headline).toContain('可执行');
    expect(summary?.mainReason).toContain('下午风速上升');
    expect(summary?.mainReason).not.toContain('交通缓冲偏紧');
    expect(summary?.suggestion).toBeUndefined();
  });
});

describe('filterConflictLinesNotOnTimeline', () => {
  it('drops conflicts already shown on timeline rows', () => {
    const lines = filterConflictLinesNotOnTimeline(
      [
        { id: 'c1', icon: Car, label: '交通缓冲偏紧', detail: '草帽山到黑教堂偏紧' },
        { id: 'c2', icon: Car, label: '连续驾驶', detail: '超过 4 小时' },
      ],
      [
        { impact: { conclusion: '交通缓冲偏紧', reason: '草帽山到黑教堂偏紧' } },
        { impact: null },
      ],
    );
    expect(lines.map((line) => line.id)).toEqual(['c2']);
  });
});
