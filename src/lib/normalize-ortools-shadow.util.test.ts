import { describe, expect, it } from 'vitest';
import {
  extractOrtToolsEvaluateShadowFromDetail,
  normalizeOrtToolsPlanningShadow,
  normalizeOrtToolsShadowHealthData,
  shouldShowOrtToolsPlanningShadowPanel,
} from '@/lib/normalize-ortools-shadow.util';
import {
  ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID,
  ORTOOLS_PLANNING_SHADOW_SCHEMA_ID,
} from '@/types/ortools-shadow';

describe('normalizeOrtToolsShadowHealthData', () => {
  it('locks writeAuthority to false', () => {
    const data = normalizeOrtToolsShadowHealthData({
      shadowRepairEnabled: true,
      solverUrlConfigured: true,
      writeAuthority: true,
      canaryStage: 'shadow',
      authoritativeCanaryFlag: false,
    });
    expect(data.writeAuthority).toBe(false);
    expect(data.shadowRepairEnabled).toBe(true);
  });
});

describe('extractOrtToolsEvaluateShadowFromDetail', () => {
  it('reads workspace.ortoolsShadow and locks shadowAuthority', () => {
    const shadow = extractOrtToolsEvaluateShadowFromDetail({
      workspace: {
        ortoolsShadow: {
          schemaId: ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID,
          shadowAuthority: true,
          evidenceFreshness: 'STALE',
          shadowRepairCandidates: [{ candidateId: 'c1', label: 'Swap A/B' }],
          neptuneCandidateCount: 2,
          shadowCandidateCount: 1,
        },
      },
    });
    expect(shadow?.shadowAuthority).toBe(false);
    expect(shadow?.evidenceFreshness).toBe('STALE');
    expect(shadow?.shadowRepairCandidates?.[0]?.candidateId).toBe('c1');
  });

  it('reads debug.rawCanonical.workspace.ortoolsShadow', () => {
    const shadow = extractOrtToolsEvaluateShadowFromDetail({
      debug: {
        rawCanonical: {
          workspace: {
            ortoolsShadow: {
              schemaId: ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID,
              shadowAuthority: false,
              solverOperation: 'REROUTE',
            },
          },
        },
      },
    });
    expect(shadow?.solverOperation).toBe('REROUTE');
  });
});

describe('normalizeOrtToolsPlanningShadow', () => {
  it('preserves shadowChanges as observation-only payload', () => {
    const shadow = normalizeOrtToolsPlanningShadow({
      schemaId: ORTOOLS_PLANNING_SHADOW_SCHEMA_ID,
      shadowAuthority: true,
      planningIntent: 'OPTIMIZE_ROUTE',
      shadowChanges: [{ operation: 'MOVE', label: 'obs', dayIndex: 0 }],
      legacyChangeCount: 3,
      shadowChangeCount: 1,
      labCompare: { orderConsistent: false, distanceDeltaMeters: 120 },
    });
    expect(shadow?.shadowAuthority).toBe(false);
    expect(shadow?.shadowChanges).toHaveLength(1);
    expect(shadow?.labCompare?.distanceDeltaMeters).toBe(120);
  });
});

describe('shouldShowOrtToolsPlanningShadowPanel', () => {
  it('shows when ortoolsShadow present for OPTIMIZE_ROUTE / AUTO_ARRANGE', () => {
    const attachment = normalizeOrtToolsPlanningShadow({
      schemaId: ORTOOLS_PLANNING_SHADOW_SCHEMA_ID,
      shadowAuthority: false,
      planningIntent: 'OPTIMIZE_ROUTE',
    });
    expect(
      shouldShowOrtToolsPlanningShadowPanel('OPTIMIZE_ROUTE', attachment, true),
    ).toBe(true);
    expect(
      shouldShowOrtToolsPlanningShadowPanel('ADD_ITEM', attachment, true),
    ).toBe(false);
    expect(
      shouldShowOrtToolsPlanningShadowPanel('OPTIMIZE_ROUTE', attachment, false),
    ).toBe(false);
    expect(
      shouldShowOrtToolsPlanningShadowPanel('AUTO_ARRANGE', attachment, {
        healthLoaded: false,
        shadowRepairEnabled: false,
      }),
    ).toBe(true);
  });
});
