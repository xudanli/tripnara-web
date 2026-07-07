import { describe, expect, it } from 'vitest';
import {
  CANONICAL_L2_PHASE_CTA,
  buildCanonicalExecuteIdempotencyKey,
  classifyCanonicalL2Phase,
  isCanonicalL2Problem,
  personaLabelForSemanticCapability,
  resolveDisplayCanonicalL2Phase,
  resolveCanonicalPrimaryCta,
  resolveProblemFlow,
  routeResolutionLabel,
  shouldRefreshItineraryAfterCanonicalExecute,
  titleForSemanticCapability,
} from './canonical-decision-l2-state-machine.util';

describe('canonical-decision-l2-state-machine.util', () => {
  it('detects all three canonical slices by semanticCapability', () => {
    expect(
      isCanonicalL2Problem({ semanticCapability: 'ROAD_SEGMENT_UNAVAILABLE' }),
    ).toBe(true);
    expect(
      isCanonicalL2Problem({ semanticCapability: 'WEATHER_ACTIVITY_PROHIBITED' }),
    ).toBe(true);
    expect(isCanonicalL2Problem({ semanticCapability: 'EXCESSIVE_DAILY_LOAD' })).toBe(true);
  });

  it('detects canonical problems by route engineId', () => {
    expect(
      isCanonicalL2Problem({
        route: { engineId: 'CANONICAL_DECISION_RUNTIME' },
      }),
    ).toBe(true);
    expect(
      isCanonicalL2Problem({
        route: { engineId: 'LEGACY_V15' },
      }),
    ).toBe(false);
  });

  it('classifies L2 phases including ROLLED_BACK and NEEDS_REPAIR', () => {
    expect(
      classifyCanonicalL2Phase({
        semanticCapability: 'EXCESSIVE_DAILY_LOAD',
      }),
    ).toBe('NEEDS_EVALUATE');

    expect(
      classifyCanonicalL2Phase({
        recordStatus: 'PROPOSED',
        planVersionStatus: 'PENDING_AUTHORIZATION',
      }),
    ).toBe('AWAITING_AUTHORIZE');

    expect(
      classifyCanonicalL2Phase({
        recordStatus: 'AUTHORIZED',
        planVersionStatus: 'PENDING_EXECUTION',
      }),
    ).toBe('AWAITING_EXECUTE');

    expect(
      classifyCanonicalL2Phase({
        recordStatus: 'EFFECTIVE',
        planVersionStatus: 'EFFECTIVE',
      }),
    ).toBe('EFFECTIVE');

    expect(classifyCanonicalL2Phase({ recordStatus: 'ROLLED_BACK' })).toBe('ROLLED_BACK');
    expect(classifyCanonicalL2Phase({ recordStatus: 'NEEDS_REPAIR' })).toBe('NEEDS_REPAIR');
  });

  it('refreshes itinerary only after EFFECTIVE', () => {
    expect(shouldRefreshItineraryAfterCanonicalExecute('EFFECTIVE')).toBe(true);
    expect(shouldRefreshItineraryAfterCanonicalExecute('AWAITING_EXECUTE')).toBe(false);
    expect(shouldRefreshItineraryAfterCanonicalExecute('AWAITING_AUTHORIZE')).toBe(false);
  });

  it('maps Dr.Dre persona for daily load', () => {
    expect(personaLabelForSemanticCapability('EXCESSIVE_DAILY_LOAD')).toBe('Dr.Dre');
    expect(titleForSemanticCapability('WEATHER_ACTIVITY_PROHIBITED')).toBe('天气 / 活动限制');
  });

  it('labels non-PRIMARY route resolutions', () => {
    expect(routeResolutionLabel('PRIMARY')).toBeNull();
    expect(routeResolutionLabel('LEGACY_FALLBACK')).toBe('Legacy 回退');
    expect(routeResolutionLabel('MANUAL_REVIEW')).toBe('需人工审核');
  });

  it('resolves problem flow without destination hardcoding', () => {
    expect(
      resolveProblemFlow({ semanticCapability: 'EXCESSIVE_DAILY_LOAD' }),
    ).toBe('CANONICAL_L2');
    expect(resolveProblemFlow({ semanticCapability: 'GATE_REACH' })).toBe('LEGACY_V15');
  });

  it('builds execute idempotency key', () => {
    expect(
      buildCanonicalExecuteIdempotencyKey({
        tripId: 'trip_1',
        decisionId: 'dec_1',
      }),
    ).toBe('pv:trip_1:dec_1');
  });

  it('exposes phase CTA labels including NEEDS_REPAIR', () => {
    expect(CANONICAL_L2_PHASE_CTA.NEEDS_EVALUATE).toBe('生成方案');
    expect(CANONICAL_L2_PHASE_CTA.NEEDS_REPAIR).toBe('重新生成方案');
    expect(CANONICAL_L2_PHASE_CTA.EFFECTIVE).toBeNull();
  });

  it('overrides authorize/execute CTA for GUIDED_MANUAL', () => {
    expect(resolveCanonicalPrimaryCta('AWAITING_AUTHORIZE', 'GUIDED_MANUAL')).toBe(
      '查看手动步骤',
    );
    expect(resolveCanonicalPrimaryCta('AWAITING_EXECUTE', 'GUIDED_MANUAL')).toBe(
      '查看手动步骤',
    );
    expect(resolveCanonicalPrimaryCta('AWAITING_EXECUTE', 'DIRECT')).toBe('确认生效');
  });

  it('promotes NEEDS_EVALUATE to AWAITING_AUTHORIZE when evaluate returned candidates', () => {
    expect(
      resolveDisplayCanonicalL2Phase('NEEDS_EVALUATE', { optionCount: 2 }),
    ).toBe('AWAITING_AUTHORIZE');
    expect(
      resolveDisplayCanonicalL2Phase('NEEDS_EVALUATE', { evaluateCandidateCount: 1 }),
    ).toBe('AWAITING_AUTHORIZE');
    expect(resolveDisplayCanonicalL2Phase('NEEDS_EVALUATE', {})).toBe('NEEDS_EVALUATE');
  });
});
