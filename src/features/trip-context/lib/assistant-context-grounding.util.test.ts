import { describe, expect, it } from 'vitest';
import {
  buildAssistantContextGroundingDisplay,
  buildAssistantTravelContextGrounding,
} from './assistant-context-grounding.util';
import { classifyTravelContextError, buildHarnessFailSafeState } from './travel-context-failsafe.util';

describe('assistant-context-grounding.util', () => {
  it('builds human display from grounding', () => {
    const grounding = buildAssistantTravelContextGrounding({
      contextId: 'ctx-1',
      revision: 7,
      stage: 'PLANNING',
      openDecisionCount: 2,
      monitoringCount: 1,
      planView: { effectivePlan: { headline: '冰岛 8 日' } },
    });
    const display = buildAssistantContextGroundingDisplay(grounding);
    expect(display?.revisionLabel).toBe('上下文 v7');
    expect(display?.detail).toContain('冰岛 8 日');
    expect(display?.detail).toContain('2 项待你决定');
  });
});

describe('travel-context-failsafe.util', () => {
  it('classifies constraint and authority errors', () => {
    expect(classifyTravelContextError({ code: 'CONSTRAINT_BLOCKED' })).toBe('CONSTRAINT_BLOCKED');
    expect(classifyTravelContextError({ code: 'AUTHORITY_CHAIN' })).toBe('AUTHORITY_BLOCKED');
  });

  it('builds preserve-effective fail-safe for constraint block', () => {
    const state = buildHarnessFailSafeState('CONSTRAINT_BLOCKED');
    expect(state.preserveEffectivePlan).toBe(true);
    expect(state.title).toBeTruthy();
  });
});
