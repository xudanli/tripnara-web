import { describe, expect, it } from 'vitest';
import {
  buildIntercomAiSummary,
  buildIntercomMission,
  buildIntercomPeers,
  INTERCOM_QUICK_STATUS_LABELS,
} from './team-intercom.util';

describe('team-intercom.util', () => {
  it('builds mission from next stop', () => {
    const mission = buildIntercomMission({
      nextStopPlaceName: '蓝湖温泉',
      meetingTimeLabel: '16:40',
      minutesUntil: 38,
      contextNote: '因天气变化，已提前返程',
    });
    expect(mission.title).toContain('蓝湖温泉');
    expect(mission.meetingPoint).toContain('集合点');
    expect(mission.minutesUntil).toBe(38);
  });

  it('maps peers with self and disconnected', () => {
    const peers = buildIntercomPeers({
      members: [
        { userId: 'u1', displayName: '阿布' },
        { userId: 'u2', displayName: '妈妈' },
        { userId: 'u3', displayName: '小陈' },
        { userId: 'me', displayName: '我' },
      ],
      memberStatuses: [
        { userId: 'u2', displayName: '妈妈', conditionLabel: '略疲劳', activityLabel: '休息', level: 'yellow' },
      ],
      currentUserId: 'me',
    });
    expect(peers.find((p) => p.userId === 'me')?.connection).toBe('self');
    expect(peers.find((p) => p.userId === 'u2')?.health).toBe('rest');
    expect(INTERCOM_QUICK_STATUS_LABELS.rest).toBe('需要休息');
  });

  it('summarizes connected and rest counts', () => {
    const peers = buildIntercomPeers({
      members: [
        { userId: 'u1', displayName: 'A' },
        { userId: 'u2', displayName: 'B' },
      ],
      memberStatuses: [
        { userId: 'u2', displayName: 'B', conditionLabel: '略疲劳', activityLabel: '休息', level: 'yellow' },
      ],
      currentUserId: 'u1',
    });
    const lines = buildIntercomAiSummary(peers, []);
    expect(lines.some((l) => l.includes('需要休息'))).toBe(true);
  });
});
