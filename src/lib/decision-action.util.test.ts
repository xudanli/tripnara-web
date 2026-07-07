import { describe, expect, it } from 'vitest';
import {
  findDecisionActionForSelection,
  normalizeDecisionAction,
  resolveDecisionActionId,
  resolveDetailActions,
} from './decision-action.util';

describe('normalizeDecisionAction', () => {
  it('respects allowed: false from backend (e.g. ACCEPT_RISK on BLOCK)', () => {
    const action = normalizeDecisionAction({
      actionId: 'ACCEPT_RISK',
      label: '接受风险',
      allowed: false,
      blockedReason: '当前问题为 BLOCK，不可接受风险',
    });
    expect(action?.allowed).toBe(false);
    expect(action?.blockedReason).toContain('BLOCK');
  });

  it('defaults allowed true when omitted and no blockedReason', () => {
    const action = normalizeDecisionAction({
      actionId: 'opt_a',
      label: '方案 A',
    });
    expect(action?.allowed).toBe(true);
  });

  it('maps v2 title/summary/source fields', () => {
    const action = normalizeDecisionAction({
      actionId: 'cand_a',
      title: '绕行 F208',
      summary: '增加 40 分钟',
      source: 'ALTERNATIVE_GENERATOR',
      allowed: true,
    });
    expect(action?.title).toBe('绕行 F208');
    expect(action?.summary).toBe('增加 40 分钟');
    expect(action?.source).toBe('ALTERNATIVE_GENERATOR');
  });

  it('preserves navigationTarget object with params.externalUrl', () => {
    const action = normalizeDecisionAction({
      actionId: 'planb_0',
      label: '预订',
      allowed: true,
      navigationTarget: {
        command: 'OPEN_PLAN_GATE',
        params: { externalUrl: 'https://example.com/book' },
      },
    });
    expect(action?.navigationTarget).toEqual({
      command: 'OPEN_PLAN_GATE',
      params: { externalUrl: 'https://example.com/book' },
      externalUrl: 'https://example.com/book',
    });
  });
});

describe('resolveDecisionActionId', () => {
  it('falls back to payload.optionId', () => {
    expect(
      resolveDecisionActionId({
        actionId: '',
        label: '刷新',
        allowed: true,
        payload: { optionId: 'cand_refresh_readiness' },
      }),
    ).toBe('cand_refresh_readiness');
  });
});

describe('findDecisionActionForSelection', () => {
  it('matches selection by payload.optionId when actionId differs', () => {
    const actions = [
      {
        actionId: 'act_refresh',
        label: '刷新准备度',
        allowed: true,
        payload: { optionId: 'cand_refresh_readiness' },
      },
    ];
    expect(findDecisionActionForSelection(actions, 'cand_refresh_readiness')?.actionId).toBe(
      'act_refresh',
    );
  });
});

describe('resolveDetailActions', () => {
  it('prefers explicit actions over options mapping', () => {
    const actions = resolveDetailActions({
      actions: [{ actionId: 'a1', label: 'A', allowed: true }],
      options: [{ id: 'legacy', title: 'Legacy' }],
      writeChain: 'APPLY_AND_POLL',
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionId).toBe('a1');
  });

  it('filters allowed:false actions from default UI', () => {
    const actions = resolveDetailActions({
      actions: [
        { actionId: 'a1', label: 'A', allowed: true },
        { actionId: 'blocked', label: 'B', allowed: false },
      ],
      writeChain: 'APPLY_AND_POLL',
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionId).toBe('a1');
  });

  it('keeps suppressed actions when includeSuppressed', () => {
    const actions = resolveDetailActions({
      actions: [
        { actionId: 'a1', label: 'A', allowed: true },
        { actionId: 'blocked', label: 'B', allowed: false },
      ],
      includeSuppressed: true,
    });
    expect(actions).toHaveLength(2);
  });
});
