import { describe, expect, it } from 'vitest';
import { TRIP_COLLABORATION_MODE_ADVISOR_LED } from '@/types/trip-collaboration-mode';
import {
  isAdvisorLedTrip,
  resolveCollabCenterTabForTrip,
  resolveCollabCenterTabsForTrip,
} from './trip-collaboration-mode.util';

describe('trip-collaboration-mode.util', () => {
  it('detects advisor-led trip from tripCollaborationMode SSOT', () => {
    expect(
      isAdvisorLedTrip({
        id: 't1',
        metadata: { tripCollaborationMode: TRIP_COLLABORATION_MODE_ADVISOR_LED },
      } as never),
    ).toBe(true);
  });

  it('does not treat self_planned as advisor-led', () => {
    expect(
      isAdvisorLedTrip({
        id: 't1',
        metadata: { tripCollaborationMode: 'self_planned' },
      } as never),
    ).toBe(false);
  });

  it('falls back to legacy heuristics when mode absent', () => {
    expect(
      isAdvisorLedTrip({
        id: 't1',
        metadata: {
          responsibilityOwners: {
            planningOwner: { userId: 'u1', name: '顾问' },
          },
        },
      } as never),
    ).toBe(true);
  });

  it('does not treat generic memberInviteCodes alone as advisor-led', () => {
    expect(
      isAdvisorLedTrip({
        id: 't3',
        metadata: {
          memberInviteCodes: [{ inviteCode: 'abc', inviteUrl: '/invite/abc', label: '同行成员' }],
        },
      } as never),
    ).toBe(false);
  });

  it('exposes invites tab for self-planned trips', () => {
    const tabs = resolveCollabCenterTabsForTrip({
      id: 't1',
      metadata: { tripCollaborationMode: 'self_planned' },
    } as never);
    expect(tabs.map((t) => t.value)).toContain('invites');
  });

  it('exposes members, invites, and votes tabs for advisor-led trips', () => {
    const tabs = resolveCollabCenterTabsForTrip({
      id: 't1',
      metadata: { tripCollaborationMode: TRIP_COLLABORATION_MODE_ADVISOR_LED },
    } as never);
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.value)).toEqual(['members', 'invites', 'decisions']);
    expect(tabs[1]?.label).toBe('角色邀请');
    expect(tabs[2]?.label).toBe('团队投票');
  });

  it('allows decisions tab for advisor trips when deep-linked to vote', () => {
    expect(
      resolveCollabCenterTabForTrip(
        'decisions',
        {
          id: 't1',
          metadata: { tripCollaborationMode: TRIP_COLLABORATION_MODE_ADVISOR_LED },
        } as never,
      ),
    ).toBe('decisions');
  });

  it('allows invites tab for advisor trips', () => {
    expect(
      resolveCollabCenterTabForTrip(
        'invites',
        {
          id: 't1',
          metadata: { tripCollaborationMode: TRIP_COLLABORATION_MODE_ADVISOR_LED },
        } as never,
      ),
    ).toBe('invites');
  });

  it('redirects persona tab for advisor trips', () => {
    expect(
      resolveCollabCenterTabForTrip(
        'persona',
        {
          id: 't1',
          metadata: { tripCollaborationMode: TRIP_COLLABORATION_MODE_ADVISOR_LED },
        } as never,
      ),
    ).toBe('members');
  });
});
