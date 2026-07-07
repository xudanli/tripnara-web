import type { ExecuteMemberStatusItem } from '@/components/execute/live/ExecuteStatusSidebar';

export type IntercomPeerConnection = 'connected' | 'self' | 'disconnected';
export type IntercomPeerHealth = 'good' | 'rest' | 'unknown';

export interface IntercomPeer {
  userId: string;
  displayName: string;
  connection: IntercomPeerConnection;
  health: IntercomPeerHealth;
  distanceMeters?: number;
}

export interface IntercomMission {
  title: string;
  meetingPoint: string;
  meetingTimeLabel?: string;
  minutesUntil?: number;
  contextNote?: string;
}

export type IntercomQuickStatus = 'arrived' | 'wait' | 'rest' | 'lost';

export const INTERCOM_QUICK_STATUS_LABELS: Record<IntercomQuickStatus, string> = {
  arrived: '我到了',
  wait: '原地等',
  rest: '需要休息',
  lost: '我走散了',
};

export type IntercomMessageKind = 'voice' | 'status' | 'text' | 'system';

export interface IntercomMessageBase {
  id: string;
  /** 离线幂等键；新消息应与 id 相同 */
  clientId?: string;
  clientSeq?: number;
  kind: IntercomMessageKind;
  senderId: string;
  senderName: string;
  createdAt: string;
  pendingSync?: boolean;
  deliveredCount?: number;
  peerCount?: number;
  distanceFromRallyKm?: number;
  confirmedBy?: string[];
}

export interface IntercomVoiceMessage extends IntercomMessageBase {
  kind: 'voice';
  durationSec: number;
  transcript: string;
  waveform: number[];
}

export interface IntercomStatusMessage extends IntercomMessageBase {
  kind: 'status';
  status: IntercomQuickStatus;
  text: string;
}

export interface IntercomTextMessage extends IntercomMessageBase {
  kind: 'text';
  text: string;
}

export interface IntercomSystemMessage extends IntercomMessageBase {
  kind: 'system';
  text: string;
}

export type IntercomMessage =
  | IntercomVoiceMessage
  | IntercomStatusMessage
  | IntercomTextMessage
  | IntercomSystemMessage;

function storageKey(tripId: string): string {
  return `execute-team-intercom:${tripId}`;
}

export function loadIntercomMessages(tripId: string): IntercomMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntercomMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIntercomMessages(tripId: string, messages: IntercomMessage[]): void {
  try {
    sessionStorage.setItem(storageKey(tripId), JSON.stringify(messages));
  } catch {
    // ignore quota errors
  }
}

export function buildFakeWaveform(seed: number, bars = 24): number[] {
  const out: number[] = [];
  let x = seed;
  for (let i = 0; i < bars; i += 1) {
    x = (x * 9301 + 49297) % 233280;
    out.push(0.25 + (x / 233280) * 0.75);
  }
  return out;
}

export function buildIntercomPeers(input: {
  members: Array<{ userId: string; displayName: string }>;
  memberStatuses?: ExecuteMemberStatusItem[];
  currentUserId?: string;
}): IntercomPeer[] {
  const statusByUser = new Map(
    (input.memberStatuses ?? []).map((m) => [m.userId, m]),
  );
  const distancePool = [420, 120, undefined, 0];

  return input.members.map((member, index) => {
    const status = statusByUser.get(member.userId);
    const isSelf = member.userId === input.currentUserId;
    const health: IntercomPeerHealth =
      status?.level === 'yellow' || status?.level === 'orange' || status?.level === 'red'
        ? 'rest'
        : status
          ? 'good'
          : 'unknown';

    let connection: IntercomPeerConnection = 'connected';
    if (isSelf) connection = 'self';
    else if (index === 2 && input.members.length > 3) connection = 'disconnected';

    return {
      userId: member.userId,
      displayName: isSelf ? '你' : member.displayName,
      connection,
      health,
      distanceMeters: isSelf ? 0 : distancePool[index % distancePool.length],
    };
  });
}

export function buildIntercomMission(input: {
  tripTitle?: string;
  nextStopPlaceName?: string;
  meetingTimeLabel?: string;
  minutesUntil?: number;
  contextNote?: string;
  fallbackTitle?: string;
}): IntercomMission {
  const title = input.nextStopPlaceName
    ? `前往 ${input.nextStopPlaceName.replace(/^集合点：/, '')}`
    : input.fallbackTitle ?? '返回集合点';

  return {
    title,
    meetingPoint: input.nextStopPlaceName
      ? `集合点：${input.nextStopPlaceName.replace(/^集合点：/, '')}`
      : '集合点：待同步',
    meetingTimeLabel: input.meetingTimeLabel,
    minutesUntil: input.minutesUntil,
    contextNote: input.contextNote,
  };
}

export function buildIntercomAiSummary(peers: IntercomPeer[], messages: IntercomMessage[]): string[] {
  const connected = peers.filter((p) => p.connection === 'connected' || p.connection === 'self').length;
  const restCount = peers.filter((p) => p.health === 'rest').length;
  const pending = messages.filter((m) => m.pendingSync).length;

  const lines = [
    `${connected} 人已连接蓝牙直连`,
    restCount > 0 ? `${restCount} 人需要休息` : '全员状态稳定',
  ];

  if (pending > 0) {
    lines.push(`${pending} 条消息待同步至云端`);
  } else {
    lines.push('预计集合时间可能延后 10 分钟');
  }

  return lines;
}

export function seedIntercomDemoMessages(
  tripId: string,
  peers: IntercomPeer[],
): IntercomMessage[] {
  const existing = loadIntercomMessages(tripId);
  if (existing.length > 0) return existing;

  const abu = peers.find((p) => p.displayName !== '你') ?? peers[0];
  const mom = peers.find((p) => p.health === 'rest') ?? peers[1] ?? peers[0];
  const now = Date.now();

  const demo: IntercomMessage[] = [
    {
      id: 'demo-voice-1',
      kind: 'voice',
      senderId: abu?.userId ?? 'peer-1',
      senderName: abu?.displayName ?? '队友',
      createdAt: new Date(now - 8 * 60_000).toISOString(),
      durationSec: 8,
      transcript: '我已经到分叉口了，先在这里等你们',
      waveform: buildFakeWaveform(42),
      distanceFromRallyKm: 1.2,
      deliveredCount: 3,
      peerCount: 4,
    },
    {
      id: 'demo-status-1',
      kind: 'status',
      senderId: mom?.userId ?? 'peer-2',
      senderName: mom?.displayName ?? '队友',
      createdAt: new Date(now - 5 * 60_000).toISOString(),
      status: 'rest',
      text: '需要休息',
      confirmedBy: peers.filter((p) => p.displayName !== mom?.displayName && p.connection !== 'disconnected').map((p) => p.displayName),
    },
    {
      id: 'demo-system-1',
      kind: 'system',
      senderId: 'system',
      senderName: '系统',
      createdAt: new Date(now - 3 * 60_000).toISOString(),
      text: '离线期间消息',
    },
  ];

  saveIntercomMessages(tripId, demo);
  return demo;
}

export function formatDistance(meters?: number): string | null {
  if (meters == null) return null;
  if (meters === 0) return '已连接';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}
