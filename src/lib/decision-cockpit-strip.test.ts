import { describe, expect, it } from 'vitest';
import { pickDecisionCockpitStripSummary } from '@/lib/decision-cockpit';
import type { DecisionCockpitDto } from '@/types/decision-cockpit';

describe('pickDecisionCockpitStripSummary', () => {
  it('prefers integrity badge summary for strip subline', () => {
    const cockpit: DecisionCockpitDto = {
      integrity_badges: [
        {
          key: 'physical_evidence',
          status: 'warn',
          label_zh: '物理证据',
          summary_zh: '第 2 天路段缺少坡度核验',
        },
      ],
    };

    expect(pickDecisionCockpitStripSummary(cockpit)).toEqual({
      headline: '第 2 天路段缺少坡度核验',
      subline: '物理证据',
    });
  });

  it('falls back to trace row summary', () => {
    const cockpit: DecisionCockpitDto = {
      decision_trace_rows: [
        {
          persona: 'ABU',
          summary_zh: '安全门控建议改线',
          verdict: 'ADJUST',
        },
      ],
    };

    expect(pickDecisionCockpitStripSummary(cockpit)).toEqual({
      headline: '安全门控建议改线',
      subline: 'ADJUST',
    });
  });
});
