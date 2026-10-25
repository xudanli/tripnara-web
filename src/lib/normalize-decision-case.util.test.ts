import { describe, expect, it } from 'vitest';
import {
  decisionCaseUiGroupLabel,
  inferUiGroupFromSemanticKey,
  normalizeDecisionCaseConstraintHints,
  normalizeDecisionCaseMeta,
  normalizeDecisionOpportunityListResponse,
  resolveDecisionCaseUiGroupKey,
  resolveProblemUiGroupKey,
} from './normalize-decision-case.util';

describe('normalize-decision-case.util', () => {
  it('normalizes decisionCase and derives uiGroup from requiredness', () => {
    const meta = normalizeDecisionCaseMeta({
      sourceKind: 'REQUIRED_CHOICE',
      requiredness: 'BLOCKING',
      domain: 'TRANSPORT',
      enrichmentStage: 'SHELL',
      writebackTargets: ['VEHICLE'],
    });
    expect(meta?.uiGroup).toBe('MUST_CONFIRM');
    expect(meta?.uiGroupLabelZh).toBe('必须确认');
    expect(resolveDecisionCaseUiGroupKey(meta)).toBe('MUST_CONFIRM');
    expect(decisionCaseUiGroupLabel('IMPORTANT_CHOICE')).toBe('重要选择');
    expect(decisionCaseUiGroupLabel('MUST_CONFIRM')).toBe('必须确认');
  });

  it('keeps BFF uiGroupLabelZh and eligibility', () => {
    const meta = normalizeDecisionCaseMeta({
      sourceKind: 'RULE_TRIGGER',
      requiredness: 'IMPORTANT',
      uiGroup: 'IMPORTANT_CHOICE',
      uiGroupLabelZh: '重要选择',
      eligibility: {
        eligible: true,
        softWarnings: ['儿童乘客'],
        checks: [{ code: 'fitness', passed: true, dimension: 'fitness', detail: 'ok' }],
      },
    });
    expect(meta?.uiGroupLabelZh).toBe('重要选择');
    expect(meta?.eligibility?.softWarnings).toEqual(['儿童乘客']);
    expect(meta?.eligibility?.checks?.[0]?.dimension).toBe('fitness');
    expect(decisionCaseUiGroupLabel('IMPORTANT_CHOICE', meta?.uiGroupLabelZh)).toBe('重要选择');
  });

  it('normalizes constraintHints', () => {
    const hints = normalizeDecisionCaseConstraintHints({
      fording_excluded: true,
      writeback_payload: { insurance_coverage_tier: 'full' },
    });
    expect(hints?.fordingExcluded).toBe(true);
    expect(hints?.writebackPayload?.insurance_coverage_tier).toBe('full');
  });

  it('accepts Chinese uiGroup from BFF', () => {
    const meta = normalizeDecisionCaseMeta({
      source_kind: 'OPPORTUNITY',
      requiredness: 'IMPORTANT',
      ui_group: '关键选择',
      materiality_score: 7,
    });
    expect(meta?.sourceKind).toBe('OPPORTUNITY');
    expect(meta?.uiGroup).toBe('IMPORTANT_CHOICE');
    expect(meta?.materialityScore).toBe(7);
  });

  it('infers IMPORTANT_CHOICE for glacier semanticKey without decisionCase', () => {
    expect(inferUiGroupFromSemanticKey('OPPORTUNITY.GLACIER_EXPERIENCE', 'dc_glacier_x')).toBe(
      'IMPORTANT_CHOICE',
    );
    expect(resolveProblemUiGroupKey({ id: 'dc_glacier_x', semanticKey: 'OPPORTUNITY.GLACIER_EXPERIENCE' })).toBe(
      'IMPORTANT_CHOICE',
    );
    expect(inferUiGroupFromSemanticKey('REQUIRED_CHOICE.VEHICLE_ROAD_FIT', 'dc_vehicle_x')).toBe(
      'MUST_CONFIRM',
    );
  });

  it('normalizes opportunity list', () => {
    const list = normalizeDecisionOpportunityListResponse(
      {
        items: [
          {
            id: 'opp1',
            title: '冰川徒步',
            materialityScore: 4,
            status: 'OPEN',
          },
        ],
      },
      'trip-1',
    );
    expect(list.tripId).toBe('trip-1');
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.title).toBe('冰川徒步');
  });
});
