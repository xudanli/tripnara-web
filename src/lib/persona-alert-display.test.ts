import { describe, expect, it, vi } from 'vitest';
import {
  dispatchPersonaAlertDeepLink,
  getPersonaAlertUserBody,
  getPersonaAlertUserTitle,
  isUserVisiblePersonaAlert,
  looksLikeDebugPersonaAlertText,
} from '@/lib/persona-alert-display';
import type { PersonaAlert } from '@/types/trip';

describe('persona-alert-display (BFF M1)', () => {
  it('detects debug strings from legacy payloads', () => {
    expect(looksLikeDebugPersonaAlertText('persona closure\nstop=ABU_FATAL_REJECT rechecks=0')).toBe(
      true,
    );
  });

  it('prefers explanation over message', () => {
    expect(
      getPersonaAlertUserBody({
        explanation: '第 3 天大风不宜自驾。',
        message: 'stop=ABU_FATAL_REJECT',
      }),
    ).toBe('第 3 天大风不宜自驾。');
  });

  it('uses BFF title and hides internal audience', () => {
    const alert: PersonaAlert = {
      id: '1',
      persona: 'ABU',
      title: '当前方案被安全门控拦截',
      explanation: '请打开可执行证明查看调整项。',
      severity: 'warning',
      createdAt: '2026-01-01T00:00:00Z',
      metadata: { audience: 'user', reasonCodesDisplayZh: ['安全门控拒绝'] },
    };
    expect(getPersonaAlertUserTitle(alert)).toBe('当前方案被安全门控拦截');
    expect(isUserVisiblePersonaAlert(alert)).toBe(true);
    expect(
      isUserVisiblePersonaAlert({
        ...alert,
        metadata: { audience: 'internal' },
      }),
    ).toBe(false);
  });

  it('dispatches feasibility deep link with issueId', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('CustomEvent', class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
    vi.stubGlobal('window', { dispatchEvent });

    dispatchPersonaAlertDeepLink({ type: 'feasibility', issueId: 'issue-wind-d3' });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0]?.[0] as { type: string; detail?: { issueId?: string } };
    expect(event.type).toBe('plan-studio:open-feasibility');
    expect(event.detail).toEqual({ issueId: 'issue-wind-d3' });

    vi.unstubAllGlobals();
  });
});
