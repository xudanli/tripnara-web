import { describe, expect, it } from 'vitest';
import {
  buildDecisionProfessionalReviewDimensions,
  filterPersonaAlertsForDecisionProblem,
} from './decision-professional-review.util';
import type { PersonaAlert } from '@/types/trip';

const day5Safety: PersonaAlert = {
  id: 'abu-d5',
  persona: 'ABU',
  title: '安全',
  severity: 'warning',
  explanation:
    '你们第5天计划包含斯卡夫塔山国家公园活动，但目前存在安全风险。建议替换或延后该点。',
  createdAt: '2026-01-01T00:00:00Z',
  metadata: { deepLink: { type: 'schedule_day', dayIndex: 5 } },
};

const tipping: PersonaAlert = {
  id: 'dre-tip',
  persona: 'DR_DRE',
  title: '节奏',
  severity: 'info',
  explanation: '冰岛 tipping 习俗：无需额外付小费（通常已包含服务费）。',
  createdAt: '2026-01-01T00:00:00Z',
};

const day1Glacier: PersonaAlert = {
  id: 'abu-glacier',
  persona: 'ABU',
  title: '冰川',
  severity: 'info',
  explanation: '第1天附近有多个冰川产品，建议合并为同一决策以减少重复确认。',
  createdAt: '2026-01-01T00:00:00Z',
  metadata: { deepLink: { type: 'schedule_day', dayIndex: 1 } },
};

const glacierProblem = {
  id: 'dc_glacier_1',
  title: '选择哪种冰川体验？',
  affectedDayNumbers: [1],
  semanticKey: 'OPPORTUNITY.GLACIER',
  decisionCase: {
    sourceKind: 'OPPORTUNITY' as const,
    requiredness: 'IMPORTANT' as const,
    domain: 'EXPERIENCE',
    enrichmentStage: 'ENRICHED' as const,
    writebackTargets: ['EXPERIENCE' as const],
  },
};

describe('filterPersonaAlertsForDecisionProblem', () => {
  it('drops day-5 and trip-wide alerts for a day-1 glacier problem', () => {
    const scoped = filterPersonaAlertsForDecisionProblem(
      [day5Safety, tipping, day1Glacier],
      glacierProblem,
    );
    expect(scoped.map((alert) => alert.id)).toEqual(['abu-glacier']);
  });

  it('returns empty when nothing matches the problem', () => {
    expect(
      filterPersonaAlertsForDecisionProblem([day5Safety, tipping], glacierProblem),
    ).toEqual([]);
  });
});

describe('buildDecisionProfessionalReviewDimensions', () => {
  it('uses option tradeoffs when present', () => {
    const dimensions = buildDecisionProfessionalReviewDimensions({
      problem: glacierProblem,
      personaAlerts: [day5Safety, tipping],
      selectedOption: {
        id: 'a',
        tradeoffs: [
          { dimension: 'SAFETY', direction: 'IMPROVE', explanation: '冰川时段可执行' },
        ],
      },
      selectedOptionLetter: 'A',
    });
    expect(dimensions[0].summary).toContain('冰川时段');
    expect(dimensions.every((row) => !/第5天|斯卡夫塔|小费/.test(row.summary))).toBe(true);
  });

  it('hides review when option has no tradeoffs and alerts are unrelated', () => {
    const dimensions = buildDecisionProfessionalReviewDimensions({
      problem: glacierProblem,
      personaAlerts: [day5Safety, tipping],
      selectedOption: { id: 'a', tradeoffs: [] },
      selectedOptionLetter: 'A',
    });
    expect(dimensions).toEqual([]);
  });

  it('falls back to problem-scoped alerts only', () => {
    const dimensions = buildDecisionProfessionalReviewDimensions({
      problem: glacierProblem,
      personaAlerts: [day5Safety, tipping, day1Glacier],
      selectedOption: { id: 'a' },
      selectedOptionLetter: 'A',
    });
    expect(dimensions.length).toBe(3);
    expect(dimensions[0].summary).toMatch(/第1天|冰川/);
    expect(dimensions[0].summary).not.toMatch(/第5天|斯卡夫塔/);
    expect(dimensions[1].summary).not.toMatch(/小费|tipping/i);
  });
});
