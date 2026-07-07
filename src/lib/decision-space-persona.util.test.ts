import { describe, expect, it } from 'vitest';
import { resolveDecisionSpacePersonaOneLiner } from './decision-space-persona.util';

describe('decision-space-persona.util', () => {
  it('uses Abu for reservation block problems', () => {
    const line = resolveDecisionSpacePersonaOneLiner({
      templateKind: 'reservation',
      primaryEnforcement: 'BLOCK',
    });
    expect(line.persona).toBe('ABU');
    expect(line.quote).toContain('门控');
  });

  it('uses Dr.Dre for daily load', () => {
    const line = resolveDecisionSpacePersonaOneLiner({
      templateKind: 'daily_load',
    });
    expect(line.persona).toBe('DR_DRE');
  });
});
