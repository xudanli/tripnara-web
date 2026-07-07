import { describe, expect, it } from 'vitest';
import {
  DESTINATION_RULE_TIER_SPECS,
  expandOfficialRuleConstraintIdSet,
  isOfficialRuleConstraintId,
  resolveDestinationRuleTierSpec,
  resolveDestinationRuleViolationLabel,
  resolveFeasibilitySignalsForDestinationRule,
} from './trip-constraint-destination-rule.util';

describe('trip-constraint-destination-rule.util', () => {
  it('defines tier specs aligned with solver / UI', () => {
    expect(DESTINATION_RULE_TIER_SPECS.find((s) => s.tier === 'BLOCK')?.violationResultLabel).toBe(
      '阻断路线',
    );
    expect(DESTINATION_RULE_TIER_SPECS.find((s) => s.tier === 'CONDITIONAL')?.violationResultLabel).toBe(
      '检查条件是否满足',
    );
    expect(DESTINATION_RULE_TIER_SPECS.find((s) => s.tier === 'ADVISORY')?.violationResultLabel).toBe(
      '影响风险评分',
    );
  });

  it('detects c_official_* and c_official_poi_* ids', () => {
    expect(isOfficialRuleConstraintId('c_official_is_froad_2wd')).toBe(true);
    expect(isOfficialRuleConstraintId('c_official_poi_blue_lagoon')).toBe(true);
    expect(isOfficialRuleConstraintId('c_budget_total')).toBe(false);
  });

  it('maps BLOCK tier to must_handle + hardConstraintBlocked', () => {
    const signals = resolveFeasibilitySignalsForDestinationRule({ tier: 'BLOCK' });
    expect(signals?.priority).toBe('must_handle');
    expect(signals?.hardConstraintBlocked).toBe(true);
  });

  it('maps ADVISORY tier to pending_confirm without block', () => {
    const signals = resolveFeasibilitySignalsForDestinationRule({ tier: 'ADVISORY' });
    expect(signals?.priority).toBe('pending_confirm');
    expect(signals?.hardConstraintBlocked).toBe(false);
  });

  it('prefers contractMeta violation label', () => {
    expect(
      resolveDestinationRuleViolationLabel('BLOCK', '阻断路线', 'ignored'),
    ).toBe('阻断路线');
    expect(resolveDestinationRuleViolationLabel('ADVISORY')).toBe('影响风险评分');
  });

  it('expands official rule id variants', () => {
    const set = expandOfficialRuleConstraintIdSet(['c_official_is_froad_2wd']);
    expect(set.has('c_official_is_froad_2wd')).toBe(true);
    expect(set.has('official_is_froad_2wd')).toBe(true);
  });

  it('resolves tier spec by enum', () => {
    expect(resolveDestinationRuleTierSpec('CONDITIONAL')?.hardConstraintBlocked).toBe(false);
  });
});
