import { describe, expect, it } from 'vitest';
import {
  agentPlanDraftMutationFromPlanGateDiff,
  normalizeAgentPlanDraftMutation,
  readAgentPlanDraftMutation,
  resolveAgentPlanDraftMutationForDisplay,
} from '@/lib/agent-plan-draft-mutation.util';

describe('agent-plan-draft-mutation.util', () => {
  it('reads metadata.agentPlanDraftMutation', () => {
    const mutation = readAgentPlanDraftMutation({
      metadata: {
        agentPlanDraftMutation: {
          problemId: 'problem_abc',
          headline: '调整第 3 天转场',
          itineraryDiff: [
            {
              slotId: 'slot_1',
              changeType: 'time_changed',
              dayNumber: 3,
              before: { title: 'A', time: '09:00' },
              after: { title: 'A', time: '10:30' },
            },
          ],
        },
      },
    });
    expect(mutation?.problemId).toBe('problem_abc');
    expect(mutation?.itineraryDiff).toHaveLength(1);
  });

  it('falls back to planGate draftDiff', () => {
    const mutation = agentPlanDraftMutationFromPlanGateDiff({
      baselineLabel: 'A3',
      draftLabel: 'A4',
      timelineChanges: [{ kind: 'move', day: 2, label: '延后出发', before: '09:00', after: '11:00' }],
    });
    expect(mutation?.headline).toContain('A4');
    expect(mutation?.timelineChanges).toHaveLength(1);
  });

  it('prefers metadata over draftDiff fallback', () => {
    const resolved = resolveAgentPlanDraftMutationForDisplay({
      planState: {
        metadata: {
          agentPlanDraftMutation: normalizeAgentPlanDraftMutation({
            problemId: 'p_meta',
            summary: 'from metadata',
          }),
        },
      },
      draftDiff: {
        baselineLabel: 'A1',
        timelineChanges: [{ kind: 'x', day: 1, label: 'fallback' }],
      },
    });
    expect(resolved?.problemId).toBe('p_meta');
    expect(resolved?.summary).toBe('from metadata');
  });
});
