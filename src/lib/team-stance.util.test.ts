import { describe, expect, it } from 'vitest';
import { buildPersonaTeamStanceCards, buildTeamStanceCards } from '@/lib/team-stance.util';
import type { DecisionOption } from '@/types/decision-problem';
import type { Collaborator } from '@/types/trip';

describe('team-stance.util', () => {
  const option: DecisionOption = {
    id: 'opt_a',
    label: '方案 A',
    tradeoffs: [
      { dimension: 'SAFETY', direction: 'IMPROVE', explanation: '更安全，驾驶更轻松。' },
      { dimension: 'FATIGUE', direction: 'UNCHANGED', explanation: '删景点影响体验。' },
      { dimension: 'POI_COVERAGE', direction: 'WORSEN', explanation: '预算会超一些。' },
    ],
  };

  it('builds three persona stance cards from selected option', () => {
    const cards = buildPersonaTeamStanceCards({
      selectedOption: option,
      selectedOptionLetter: 'A',
    });
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.name)).toEqual(['Abu', 'Dr.Dre', 'Neptune']);
    expect(cards[0]?.levelLabel).toBe('强烈支持');
    expect(cards[1]?.levelLabel).toBe('可以接受');
    expect(cards[2]?.levelLabel).toBe('有顾虑');
  });

  it('includes member card when multiple collaborators exist', () => {
    const collaborators = [
      { id: '1', tripId: 't', userId: 'u1', role: 'OWNER', createdAt: '' },
      { id: '2', tripId: 't', userId: 'u2', role: 'EDITOR', createdAt: '' },
    ] as Collaborator[];
    const cards = buildTeamStanceCards({
      collaborators,
      selectedOption: option,
      selectedOptionLetter: 'A',
    });
    expect(cards).toHaveLength(4);
    expect(cards[3]?.kind).toBe('member');
    expect(cards[3]?.members).toHaveLength(2);
  });
});
