import { describe, expect, it } from 'vitest';
import { canStartDecisionSpaceCollaboration } from './decision-space-collaboration.util';

describe('decision-space-collaboration.util', () => {
  it('allows collaboration when travelers >= 2', () => {
    expect(canStartDecisionSpaceCollaboration({ travelerCount: 2, collaboratorCount: 0 })).toBe(true);
  });

  it('allows collaboration when at least one collaborator exists', () => {
    expect(canStartDecisionSpaceCollaboration({ travelerCount: 1, collaboratorCount: 1 })).toBe(true);
  });

  it('blocks solo planning without collaborators', () => {
    expect(canStartDecisionSpaceCollaboration({ travelerCount: 1, collaboratorCount: 0 })).toBe(false);
  });
});
