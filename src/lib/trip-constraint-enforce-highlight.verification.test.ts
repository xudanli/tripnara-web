/**
 * P1 enforce 高亮验证 — 不夜驾场景
 *
 * 前置：自驾行程中存在一段日落后仍结束的驾驶段。
 * 期望：
 * - GET /constraints → items[].c_no_night_drive.hasConflict === true
 * - POST /constraints/check → contractConflicts.conflictConstraintIds 含 c_no_night_drive
 * - 约束控制台左侧「不夜驾」卡片 cardTone=danger、hasConflict=true
 */
import { describe, expect, it } from 'vitest';
import { Car } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  attachContractConflictIds,
  expandContractConflictIdSet,
} from '@/lib/trip-constraints-contract.util';
import { attachCheckIssuesToEntries } from '@/lib/constraint-console-partition.util';
import {
  apiConstraintIdToUi,
  mergeApiListWithClientEntries,
  tripConstraintToListEntry,
} from '@/lib/trip-constraints.adapter';
import type {
  TripConstraint,
  TripConstraintsCheckResponse,
  TripConstraintsListResponse,
} from '@/types/trip-constraints';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';

const NO_NIGHT_DRIVE_API: TripConstraint = {
  id: TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
  name: '不夜驾',
  type: 'HARD',
  category: 'SAFETY',
  enabled: true,
  scope: { type: 'TRIP' },
  displayValue: '日落后 30 分钟',
  source: { type: 'USER', templateId: 'no_night_drive' },
  value: {
    maxMinutesAfterSunset: 30,
    judgmentRule: '日落后 30 分钟不得继续驾驶',
    violationResult: '阻断执行',
  },
  contractMeta: {
    enabledSummary: '已启用：不夜驾',
    scopeLabel: '整趟行程',
    judgmentRule: '日落后 30 分钟不得继续驾驶',
    violationResult: 'BLOCK',
    violationResultLabel: '阻断执行',
  },
  sectionKey: 'hard_must_satisfy',
};

function applyCheckHighlightPipeline(
  entries: ConstraintListEntry[],
  check: TripConstraintsCheckResponse,
): ConstraintListEntry[] {
  return attachContractConflictIds(
    attachCheckIssuesToEntries(entries, check.issues),
    check.contractConflicts?.conflictConstraintIds,
  );
}

describe('no_night_drive enforce highlight verification', () => {
  it('maps c_no_night_drive to ui id no_night_drive', () => {
    expect(apiConstraintIdToUi(TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE)).toBe('no_night_drive');
  });

  it('GET hasConflict alone highlights the card (before POST /check)', () => {
    const entry = tripConstraintToListEntry({ ...NO_NIGHT_DRIVE_API, hasConflict: true });
    expect(entry.id).toBe('no_night_drive');
    expect(entry.hasConflict).toBe(true);
    expect(entry.cardTone).toBe('danger');
  });

  it('POST /check contractConflicts.conflictConstraintIds highlights no_night_drive', () => {
    const entry = tripConstraintToListEntry({ ...NO_NIGHT_DRIVE_API, hasConflict: false });
    const [highlighted] = attachContractConflictIds([entry], [
      TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
    ]);
    expect(highlighted?.hasConflict).toBe(true);
    expect(highlighted?.cardTone).toBe('danger');
  });

  it('expandContractConflictIdSet accepts api id, ui id, and template aliases', () => {
    const set = expandContractConflictIdSet([TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE]);
    expect(set.has('c_no_night_drive')).toBe(true);
    expect(set.has('no_night_drive')).toBe(true);
  });

  it('end-to-end: GET list merge + check contractConflicts (useTripConstraints pipeline)', () => {
    const getResponse: TripConstraintsListResponse = {
      meta: {
        tripId: 'trip-self-drive',
        constraintsVersion: 4,
        total: 1,
        conflictCount: 1,
        sections: [
          {
            key: 'hard_must_satisfy',
            label: '必须满足',
            constraintIds: [TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE],
          },
        ],
      },
      items: [{ ...NO_NIGHT_DRIVE_API, hasConflict: true }],
      contract: {},
    };

    const checkResponse: TripConstraintsCheckResponse = {
      hasConflicts: true,
      contractConflicts: {
        hasConflicts: true,
        mustHandle: 1,
        conflictConstraintIds: [TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE],
      },
      issues: [
        {
          id: 'issue_no_night_drive_d2',
          constraintId: TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
          severity: 'must_handle',
          message: '第 2 天驾驶段结束晚于日落后 30 分钟',
        },
      ],
    };

    const merged = mergeApiListWithClientEntries(getResponse, {
      hardItems: [],
      softItems: [],
      externalItems: [],
    });
    expect(merged.hardItems).toHaveLength(1);
    expect(merged.hardItems[0]?.id).toBe('no_night_drive');
    expect(merged.hardItems[0]?.hasConflict).toBe(true);

    const highlighted = applyCheckHighlightPipeline(merged.hardItems, checkResponse);
    const nightDrive = highlighted.find((item) => item.id === 'no_night_drive');
    expect(nightDrive?.hasConflict).toBe(true);
    expect(nightDrive?.cardTone).toBe('danger');
    expect(nightDrive?.checkIssueId).toBe('issue_no_night_drive_d2');
  });

  it('GET hasConflict false but check ids present still highlights (check-only path)', () => {
    const entry = tripConstraintToListEntry({ ...NO_NIGHT_DRIVE_API, hasConflict: false });
    const [highlighted] = applyCheckHighlightPipeline([entry], {
      contractConflicts: {
        conflictConstraintIds: [TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE],
      },
    });
    expect(highlighted?.hasConflict).toBe(true);
    expect(highlighted?.cardTone).toBe('danger');
  });
});
