import { describe, expect, it } from 'vitest';
import type { TripDetail } from '@/types/trip';
import { buildCreateTeamRequestFromPlannedTravelers } from '@/lib/team-from-planned-travelers';

describe('team-from-planned-travelers', () => {
  it('creates team sized to planned traveler count with placeholders', () => {
    const trip = {
      name: '冰岛家庭游',
      destination: 'IS',
      pacingConfig: {
        travelers: [
          { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
          { type: 'ADULT', mobilityTag: 'CITY_POTATO' },
        ],
      },
    } as TripDetail;

    const request = buildCreateTeamRequestFromPlannedTravelers({
      trip,
      currentUserId: 'user-1',
      currentUserDisplayName: '我',
    });

    expect(request.members).toHaveLength(2);
    expect(request.members[0]?.role).toBe('LEADER');
    expect(request.members[1]?.displayName).toBe('同行者');
    expect(request.decisionWeightMode).toBe('EQUAL');
    expect(request.name).toContain('冰岛家庭游');
  });

  it('prefers collaborators before placeholders', () => {
    const trip = {
      pacingConfig: {
        travelers: [
          { type: 'ADULT', mobilityTag: 'ACTIVE_SENIOR' },
          { type: 'ADULT', mobilityTag: 'ACTIVE_SENIOR' },
        ],
      },
    } as TripDetail;

    const request = buildCreateTeamRequestFromPlannedTravelers({
      trip,
      currentUserId: 'user-1',
      currentUserDisplayName: 'Alice',
      collaborators: [
        {
          id: 'c1',
          tripId: 't1',
          userId: 'user-2',
          displayName: 'Bob',
          role: 'EDITOR',
          createdAt: '',
        },
      ],
    });

    expect(request.members).toHaveLength(2);
    expect(request.members[1]?.userId).toBe('user-2');
    expect(request.members[1]?.displayName).toBe('Bob');
  });
});
