import { describe, expect, it } from 'vitest';
import {
  buildGuardianDecisionLogView,
  enrichWorkbenchDecisionLogEntry,
  readGuardianDecisionLogMetadata,
} from '@/lib/guardian-decision-log-display';

describe('readGuardianDecisionLogMetadata', () => {
  it('returns null when no guardian fields', () => {
    expect(readGuardianDecisionLogMetadata({ foo: 'bar' })).toBeNull();
    expect(readGuardianDecisionLogMetadata(null)).toBeNull();
  });

  it('reads P0/P2 guardian metadata', () => {
    const meta = readGuardianDecisionLogMetadata({
      revalidationPass: 'POST_NEPTUNE_REPAIR',
      guardianLeadSpeaker: 'NEPTUNE',
      guardianScenario: 'SAFETY_BLOCK',
      guardianActions: { abu: 'BLOCK', neptune: 'REPAIR' },
      guardianExpressionPhase: 'in_trip',
    });
    expect(meta?.revalidationPass).toBe('POST_NEPTUNE_REPAIR');
    expect(meta?.guardianLeadSpeaker).toBe('NEPTUNE');
    expect(meta?.guardianScenario).toBe('SAFETY_BLOCK');
    expect(meta?.guardianActions?.abu).toBe('BLOCK');
    expect(meta?.guardianExpressionPhase).toBe('in_trip');
  });
});

describe('buildGuardianDecisionLogView', () => {
  it('builds labels for timeline badges', () => {
    const view = buildGuardianDecisionLogView({
      metadata: {
        revalidationPass: 'POST_NEPTUNE_REPAIR',
        guardianLeadSpeaker: 'DR_DRE',
        guardianScenario: 'PACE_COST',
        guardianActions: { dre: 'ADJUST' },
      },
      persona: 'ABU',
    });
    expect(view?.revalidationLabel).toBe('修复后复核');
    expect(view?.leadSpeakerLabel).toContain('Dr');
    expect(view?.scenarioLabel).toBe('节奏与体力');
    expect(view?.actionsSummary).toContain('Dr.Dre');
  });

  it('falls back to log persona for lead speaker', () => {
    const view = buildGuardianDecisionLogView({
      metadata: { guardianScenario: 'ALL_CLEAR' },
      persona: 'NEPTUNE',
    });
    expect(view?.leadSpeakerLabel).toContain('Neptune');
  });

  it('returns null without guardian metadata', () => {
    expect(buildGuardianDecisionLogView({ metadata: {}, persona: 'ABU' })).toBeNull();
  });
});

describe('enrichWorkbenchDecisionLogEntry', () => {
  it('attaches guardianView when metadata present', () => {
    const enriched = enrichWorkbenchDecisionLogEntry({
      id: '1',
      timestamp: '2026-06-25T00:00:00Z',
      action: 'guardian_review',
      persona: 'ABU',
      metadata: {
        revalidationPass: 'POST_NEPTUNE_REPAIR',
        guardianLeadSpeaker: 'ABU',
      },
    });
    expect(enriched.guardianView?.revalidationLabel).toBe('修复后复核');
    expect(enriched.guardianView?.leadSpeakerLabel).toContain('Abu');
  });

  it('returns entry unchanged without guardian metadata', () => {
    const entry = {
      id: '2',
      timestamp: '2026-06-25T00:00:00Z',
      action: 'plan_update',
    };
    expect(enrichWorkbenchDecisionLogEntry(entry)).toEqual(entry);
  });
});
