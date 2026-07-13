import { describe, expect, it } from 'vitest';
import {
  applyAssessmentToEntry,
  buildAssessmentLookup,
  buildConstraintCardView,
  buildLaneBadges,
  resolveAssessmentForConstraint,
} from './frontend-constraint-card-view.util';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { Clock } from 'lucide-react';
import type { UnifiedConstraintAssessmentBundle } from '@/types/frontend-constraint-assessment-api.types';

const baseEntry: ConstraintListEntry = {
  id: 'daily_drive',
  kind: 'hard',
  label: '每日驾驶限制',
  value: '≤ 6小时',
  icon: Clock,
  metadata: {
    enabledLabel: '已启用',
    scopeLabel: '整趟行程',
    scopeRows: [],
    ruleLabel: '单日驾驶时长不超过 6 小时',
    violationLabel: '阻断执行',
  },
};

describe('buildAssessmentLookup', () => {
  it('indexes by legacyConstraintId and constraintKey', () => {
    const bundle: UnifiedConstraintAssessmentBundle = {
      tripId: 'trip-1',
      assessments: [
        {
          constraintKey: 'MAX_DAILY_DRIVE',
          legacyConstraintId: 'c_max_daily_drive',
          aggregateStatus: 'PASS',
          lanes: { planning: null, executability: null },
        },
      ],
    };
    const lookup = buildAssessmentLookup(bundle);
    expect(lookup.get('c_max_daily_drive')?.aggregateStatus).toBe('PASS');
    expect(lookup.get('MAX_DAILY_DRIVE')?.aggregateStatus).toBe('PASS');
    expect(lookup.get('daily_drive')?.aggregateStatus).toBe('PASS');
  });
});

describe('buildLaneBadges', () => {
  it('formats executability BLOCK with ruleId and evidence (Case B)', () => {
    const badges = buildLaneBadges({
      constraintKey: 'MAX_DAILY_DRIVE',
      aggregateStatus: 'EXECUTION_BLOCK',
      lanes: {
        planning: null,
        executability: {
          status: 'BLOCK',
          source: 'TEP',
          ruleId: 'SDR-101',
          evidence: { day: 1, actual: '6h56m' },
        },
      },
    });

    expect(badges).toHaveLength(1);
    expect(badges[0]?.laneLabel).toBe('执行');
    expect(badges[0]?.statusLabel).toBe('不可执行');
    expect(badges[0]?.detail).toBe('SDR-101 · Day1 6h56m');
  });

  it('formats NO_NIGHT_DRIVE executability evidence with sunset/cutoff fields', () => {
    const badges = buildLaneBadges({
      constraintKey: 'NO_NIGHT_DRIVE',
      contractRequirement: '日落后 30 分钟内结束驾驶',
      aggregateStatus: 'EXECUTION_BLOCK',
      lanes: {
        planning: null,
        executability: {
          status: 'BLOCK',
          source: 'TEP',
          ruleId: 'SDR-202',
          message: '预计 23:40 仍在驾驶，超出日落后 30 分钟',
          evidence: {
            day: 1,
            segmentLabel: '雷克雅未克 → 维克',
            arriveLocal: '23:40',
            cutoffLocal: '23:57',
            sunsetLocal: '23:27',
            maxMinutesAfterSunset: 30,
          },
        },
      },
    });

    expect(badges[0]?.detail).toContain('雷克雅未克 → 维克');
    expect(badges[0]?.detail).toContain('23:40 结束');
    expect(badges[0]?.detail).toContain('日落 23:27');
  });

  it('returns empty badges for PASS with null lanes (Case A)', () => {
    const badges = buildLaneBadges({
      constraintKey: 'MAX_DAILY_DRIVE',
      aggregateStatus: 'PASS',
      lanes: { planning: null, executability: null },
    });
    expect(badges).toEqual([]);
  });
});

describe('buildConstraintCardView contractRequirement', () => {
  it('uses assessment contractRequirement when present', () => {
    const card = buildConstraintCardView({
      entry: baseEntry,
      assessment: {
        constraintKey: 'NO_NIGHT_DRIVE',
        contractRequirement: '日落后 30 分钟内结束驾驶',
        aggregateStatus: 'EXECUTION_BLOCK',
        lanes: {
          planning: null,
          executability: {
            status: 'BLOCK',
            ruleId: 'SDR-202',
            evidence: { day: 1, arriveLocal: '23:40', cutoffLocal: '23:57' },
          },
        },
      },
      tripId: 'trip-pilot',
    });

    expect(card.contractRequirement).toBe('日落后 30 分钟内结束驾驶');
  });
});

describe('buildConstraintCardView', () => {
  it('uses aggregateStatus for UI tone, not constraint type', () => {
    const card = buildConstraintCardView({
      entry: baseEntry,
      assessment: {
        constraintKey: 'MAX_DAILY_DRIVE',
        aggregateStatus: 'EXECUTION_BLOCK',
        lanes: {
          planning: null,
          executability: {
            status: 'BLOCK',
            ruleId: 'SDR-101',
            evidence: { day: 1, actual: '6h56m' },
          },
        },
        problemIds: ['dp-sdr-101'],
      },
      tripId: 'trip-pilot',
    });

    expect(card.aggregateUi.tone).toBe('danger');
    expect(card.aggregateUi.label).toBe('不可执行');
    expect(card.repairProblemId).toBe('dp-sdr-101');
    expect(card.contractRequirement).toContain('6 小时');
  });

  it('joins assessment via capability.constraintKey', () => {
    const lookup = buildAssessmentLookup({
      tripId: 't1',
      assessments: [
        {
          constraintKey: 'NO_NIGHT_DRIVE',
          aggregateStatus: 'WARN',
          lanes: {
            planning: { status: 'WARNING' },
            executability: null,
          },
        },
      ],
    });

    const hit = resolveAssessmentForConstraint(
      {
        id: 'c_no_night_drive',
        capability: { constraintKey: 'NO_NIGHT_DRIVE' },
      },
      lookup,
    );
    expect(hit?.aggregateStatus).toBe('WARN');
  });
});

describe('applyAssessmentToEntry', () => {
  it('overrides statusLabel from aggregateStatus', () => {
    const card = buildConstraintCardView({
      entry: baseEntry,
      assessment: {
        constraintKey: 'MAX_DAILY_DRIVE',
        aggregateStatus: 'PASS',
        lanes: { planning: null, executability: null },
      },
      tripId: 'trip-1',
    });
    const enriched = applyAssessmentToEntry(baseEntry, card);
    expect(enriched.statusLabel).toBe('满足');
    expect(enriched.assessmentTone).toBe('success');
  });
});
