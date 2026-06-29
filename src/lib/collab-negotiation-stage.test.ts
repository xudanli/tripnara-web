import { describe, expect, it } from 'vitest';
import {
  buildNegotiationOptions,
  buildSpeakerSlots,
  resolveNegotiationStageStep,
} from './collab-negotiation-stage';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';

const task = {
  id: 't1',
  domain: 'activities',
  title: '活动选择',
  status: 'in_discussion',
  statusLabel: '讨论中',
  crossLevel: 'medium',
  closesAt: null,
} as DomainNegotiationTask;

describe('collab-negotiation-stage', () => {
  it('resolveNegotiationStageStep for pending task', () => {
    expect(resolveNegotiationStageStep({ ...task, status: 'pending' }, null)).toBe('propose');
  });

  it('resolveNegotiationStageStep for collecting with utterances', () => {
    const detail = {
      status: 'collecting',
      utterances: [{ id: '1', userId: 'u1', displayName: 'A', turnIndex: 0, modality: 'text', content: 'x', reason: null, viaProxy: false, createdAt: '' }],
      turnOrder: ['u1', 'u2'],
      currentTurn: 0,
      currentSpeakerUserId: 'u2',
    } as PreferenceRoundDetail;
    expect(resolveNegotiationStageStep(task, detail)).toBe('clarify_views');
  });

  it('buildNegotiationOptions from heard rates', () => {
    const detail = {
      utterances: [],
      heardRates: [{ userId: 'u1', displayName: 'Alice', heardRate: 0.8 }],
      interventions: [],
    } as PreferenceRoundDetail;
    const options = buildNegotiationOptions(detail, task);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('A');
    expect(options[0].supportPct).toBe(80);
  });

  it('buildSpeakerSlots marks current speaker', () => {
    const detail = {
      turnOrder: ['u1', 'u2'],
      utterances: [],
      heardRates: null,
      currentSpeakerUserId: 'u2',
      status: 'collecting',
    } as PreferenceRoundDetail;
    const slots = buildSpeakerSlots(detail);
    expect(slots.find((s) => s.userId === 'u2')?.isCurrent).toBe(true);
  });
});
