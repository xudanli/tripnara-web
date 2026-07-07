import { describe, expect, it } from 'vitest';
import {
  SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY,
  SAFETY_CONSTRAINT_FORMAL_AUTHORITY,
} from '@/types/safety-constraints-check';
import {
  formatSafetyCheckNarrateOnlyBanner,
  isNarrateOnlySafetyConstraintCheck,
  parseSafetyConstraintCheckMeta,
  readSafetyCheckUiHints,
  shouldUseSafetyCheckForFormalGate,
} from '@/lib/safety-constraints-check.util';

const NARRATE_ONLY_BODY = {
  usage: SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY,
  formal_authority: SAFETY_CONSTRAINT_FORMAL_AUTHORITY,
  is_blocked: true,
  requires_approval: true,
  violations: [{ code: 'V1', message: '单段距离超限', severity: 'must_handle' }],
  warnings: [{ code: 'W1', message: '建议预留缓冲', severity: 'warning' }],
};

describe('safety-constraints-check.util', () => {
  it('parses narrate-only ConstraintEvaluationGateway payload', () => {
    const meta = parseSafetyConstraintCheckMeta(NARRATE_ONLY_BODY);
    expect(meta.usage).toBe(SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY);
    expect(meta.formal_authority).toBe(SAFETY_CONSTRAINT_FORMAL_AUTHORITY);
    expect(meta.violations).toHaveLength(1);
    expect(meta.warnings).toHaveLength(1);
  });

  it('does not treat is_blocked as formal gate in narrate_only', () => {
    const meta = parseSafetyConstraintCheckMeta(NARRATE_ONLY_BODY);
    expect(isNarrateOnlySafetyConstraintCheck(meta)).toBe(true);
    expect(shouldUseSafetyCheckForFormalGate(meta)).toBe(false);
  });

  it('allows formal gate only when not narrate_only and is_blocked', () => {
    expect(
      shouldUseSafetyCheckForFormalGate({
        usage: 'formal',
        is_blocked: true,
      }),
    ).toBe(true);
    expect(
      shouldUseSafetyCheckForFormalGate({
        usage: 'formal',
        is_blocked: false,
      }),
    ).toBe(false);
  });

  it('exposes violations/warnings as UI hints only', () => {
    const hints = readSafetyCheckUiHints(parseSafetyConstraintCheckMeta(NARRATE_ONLY_BODY));
    expect(hints.violations[0]?.message).toContain('单段距离');
    expect(hints.warnings[0]?.message).toContain('缓冲');
  });

  it('formats narrate-only banner', () => {
    expect(formatSafetyCheckNarrateOnlyBanner(parseSafetyConstraintCheckMeta(NARRATE_ONLY_BODY))).toContain(
      'decision-problems',
    );
  });
});
