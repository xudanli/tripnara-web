import { describe, expect, it } from 'vitest';
import { CONSUMER_TO_API_PRINCIPLE, toApiPrinciples } from './principle-mapping';

const BACKEND_ALLOWED = [
  'LOW_DRIVING',
  'NO_NIGHT_DRIVING',
  'CORE_EXPERIENCE_FIRST',
  'REMOTE_EXPLORATION',
  'BUDGET_FLEXIBLE',
  'STAY_STABILITY',
] as const;

describe('principle-mapping', () => {
  it('maps all consumer cards to backend enum values', () => {
    for (const apiId of Object.values(CONSUMER_TO_API_PRINCIPLE)) {
      expect(BACKEND_ALLOWED).toContain(apiId);
    }
  });

  it('maps default QA selection (experience, pace, lodging)', () => {
    expect(toApiPrinciples(['experience', 'pace', 'lodging'])).toEqual([
      { principleId: 'CORE_EXPERIENCE_FIRST', rank: 1 },
      { principleId: 'LOW_DRIVING', rank: 2 },
      { principleId: 'STAY_STABILITY', rank: 3 },
    ]);
  });
});
