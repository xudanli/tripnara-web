import { describe, expect, it } from 'vitest';
import {
  extractGuardianPresentation,
  extractPlanningAssistantPresentation,
  formatGuardianActionsSummary,
  isHardConstraintBlock,
  isNegotiationHardBlocked,
  isTeamNegotiationHardBlocked,
  collectTeamNegotiationCriticalConcerns,
  shouldShowPersonaInsightCards,
  extractChooseOptions,
  canShowGuardianChoose,
  resolveGuardianChoosePoints,
} from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import type { NegotiationResponse, TeamNegotiationResponse } from '@/types/optimization-v2';

const basePresentation = (
  overrides: Partial<GuardianPersonaPresentation> = {},
): GuardianPersonaPresentation => ({
  mode: 'single_lead',
  scenario: 'ALL_CLEAR',
  leadSpeaker: 'ABU',
  headline: '测试',
  narrative: '叙事',
  expressionPhase: 'planning',
  displayStyle: 'design_advisory',
  supportingLines: [],
  actions: {},
  structuredStatus: {},
  ...overrides,
});

describe('extractPlanningAssistantPresentation', () => {
  it('reads personaEvaluation.presentation from chat response', () => {
    const presentation = basePresentation({ headline: '场景2' });
    expect(
      extractPlanningAssistantPresentation({
        message: 'ok',
        personaEvaluation: { presentation, consolidatedDecision: { status: 'ALLOW', summary: '', nextSteps: [] }, personas: { abu: null, drdre: null, neptune: null }, timestamp: '' },
      })?.headline,
    ).toBe('场景2');
  });
});

describe('extractGuardianPresentation', () => {
  it('reads nested workbench uiOutput.personas.presentation', () => {
    const presentation = basePresentation({ headline: '嵌套' });
    const res = {
      data: {
        uiOutput: {
          personas: { presentation },
        },
      },
    };
    expect(extractGuardianPresentation(res)?.headline).toBe('嵌套');
  });

  it('reads personaEvaluation.presentation', () => {
    const presentation = basePresentation({ headline: '评估' });
    expect(
      extractGuardianPresentation({ personaEvaluation: { presentation } })?.headline,
    ).toBe('评估');
  });

  it('prefers personaEvaluation over root guardianPresentation', () => {
    const fromEval = basePresentation({ headline: '来自评估' });
    const fromRoot = basePresentation({ headline: '来自根' });
    expect(
      extractGuardianPresentation({
        personaEvaluation: { presentation: fromEval },
        guardianPresentation: fromRoot,
      })?.headline,
    ).toBe('来自评估');
  });
});

describe('isHardConstraintBlock', () => {
  it('respects hardConstraintBlocked flag', () => {
    expect(
      isHardConstraintBlock(
        basePresentation({ scenario: 'ALL_CLEAR', hardConstraintBlocked: true }),
      ),
    ).toBe(true);
  });

  it('detects SAFETY_BLOCK scenario', () => {
    expect(
      isHardConstraintBlock(basePresentation({ scenario: 'SAFETY_BLOCK' })),
    ).toBe(true);
  });
});

describe('isNegotiationHardBlocked', () => {
  it('blocks on REJECT decision', () => {
    const result = {
      decision: 'REJECT',
      evaluationSummary: { criticalConcerns: [] },
    } as NegotiationResponse;
    expect(isNegotiationHardBlocked(result)).toBe(true);
  });

  it('blocks on critical concern keywords', () => {
    const result = {
      decision: 'NEEDS_HUMAN',
      evaluationSummary: { criticalConcerns: ['F路封路，无法通行'] },
    } as NegotiationResponse;
    expect(isNegotiationHardBlocked(result)).toBe(true);
  });

  it('respects hardConstraintBlocked false over keywords', () => {
    const result = {
      decision: 'NEEDS_HUMAN',
      hardConstraintBlocked: false,
      evaluationSummary: { criticalConcerns: ['F路封路，无法通行'] },
    } as NegotiationResponse;
    expect(isNegotiationHardBlocked(result)).toBe(false);
  });

  it('respects hardConstraintBlocked true', () => {
    const result = {
      decision: 'NEEDS_HUMAN',
      hardConstraintBlocked: true,
      evaluationSummary: { criticalConcerns: [] },
    } as NegotiationResponse;
    expect(isNegotiationHardBlocked(result)).toBe(true);
  });
});

describe('team negotiation hard block', () => {
  const baseTeamResult = (): TeamNegotiationResponse => ({
    decision: 'NEEDS_HUMAN',
    consensusLevel: 0.5,
    memberEvaluations: [],
    conflicts: [],
    teamConstraintsSatisfied: true,
  });

  it('blocks on REJECT', () => {
    expect(
      isTeamNegotiationHardBlocked({ ...baseTeamResult(), decision: 'REJECT' }),
    ).toBe(true);
  });

  it('blocks when weakest-link constraints fail', () => {
    expect(
      isTeamNegotiationHardBlocked({
        ...baseTeamResult(),
        teamConstraintsSatisfied: false,
      }),
    ).toBe(true);
  });

  it('collects member hard-constraint concerns', () => {
    const concerns = collectTeamNegotiationCriticalConcerns({
      ...baseTeamResult(),
      memberEvaluations: [
        {
          userId: 'u1',
          displayName: 'A',
          utility: 0.5,
          concerns: ['高山封路，无法通行'],
        },
      ],
    });
    expect(concerns).toContain('高山封路，无法通行');
  });
});

describe('extractChooseOptions', () => {
  it('prefers humanDecisionPoints over nextSteps', () => {
    expect(
      extractChooseOptions({
        humanDecisionPoints: ['A', 'B'],
        consolidatedDecision: { nextSteps: ['C'] },
      }),
    ).toEqual(['A', 'B']);
  });

  it('reads humanDecisionPointsFlat for team', () => {
    expect(
      extractChooseOptions({
        humanDecisionPointsFlat: ['团队选项 1', '团队选项 2'],
      }),
    ).toEqual(['团队选项 1', '团队选项 2']);
  });
});

describe('canShowGuardianChoose', () => {
  it('hides when hard blocked', () => {
    expect(
      canShowGuardianChoose({
        decision: 'NEEDS_HUMAN',
        hardConstraintBlocked: true,
        chooseOptions: ['A'],
      }),
    ).toBe(false);
  });

  it('shows for NEEDS_HUMAN with options', () => {
    expect(
      canShowGuardianChoose({
        decision: 'NEEDS_HUMAN',
        chooseOptions: ['A', 'B'],
      }),
    ).toBe(true);
  });
});

describe('shouldShowPersonaInsightCards', () => {
  it('hides cards for single_lead presentation', () => {
    expect(shouldShowPersonaInsightCards(basePresentation())).toBe(false);
  });

  it('shows cards for decision_committee', () => {
    expect(
      shouldShowPersonaInsightCards(basePresentation({ mode: 'decision_committee' })),
    ).toBe(true);
  });
});

describe('formatGuardianActionsSummary', () => {
  it('formats action slots', () => {
    expect(
      formatGuardianActionsSummary({ abu: 'BLOCK', neptune: 'REPAIR' }),
    ).toContain('Abu·阻止继续');
  });
});

describe('resolveGuardianChoosePoints', () => {
  it('returns fallback when CHOOSE', () => {
    expect(
      resolveGuardianChoosePoints(
        basePresentation({ actions: { user: 'CHOOSE' } }),
        ['选项 A', '选项 B'],
      ),
    ).toEqual(['选项 A', '选项 B']);
  });

  it('returns undefined when not CHOOSE', () => {
    expect(resolveGuardianChoosePoints(basePresentation())).toBeUndefined();
  });
});
