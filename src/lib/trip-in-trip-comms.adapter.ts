import type {
  CommsMessageType,
  TripInTripCommsMessage,
  TripInTripCommsPeer,
} from '@/types/trip-in-trip-comms';
import { buildFakeWaveform } from '@/lib/team-intercom.util';
import type {
  IntercomMessage,
  IntercomPeer,
  IntercomPeerConnection,
  IntercomQuickStatus,
} from '@/lib/team-intercom.util';

export function uiMessageToSyncPayload(message: IntercomMessage, clientSeq: number): {
  clientId: string;
  clientSeq: number;
  type: CommsMessageType;
  body: string;
  audio?: TripInTripCommsMessage['audio'];
  createdAt: string;
  metadata?: Record<string, unknown>;
} {
  const clientId = message.clientId ?? message.id;
  const base = {
    clientId,
    clientSeq,
    createdAt: message.createdAt,
  };

  if (message.kind === 'voice') {
    return {
      ...base,
      type: 'voice',
      body: message.transcript?.trim() || `[语音 ${message.durationSec}s]`,
      audio: { durationSec: message.durationSec },
      metadata: { uiKind: 'voice' },
    };
  }

  if (message.kind === 'status') {
    return {
      ...base,
      type: 'text',
      body: message.text,
      metadata: { uiKind: 'status', quickStatus: message.status },
    };
  }

  if (message.kind === 'system') {
    return {
      ...base,
      type: 'system',
      body: message.text,
      metadata: { uiKind: 'system' },
    };
  }

  return {
    ...base,
    type: 'text',
    body: message.text,
    metadata: { uiKind: 'text' },
  };
}

export function apiMessageToUiMessage(remote: TripInTripCommsMessage): IntercomMessage {
  const senderId = remote.senderId ?? 'unknown';
  const senderName = remote.senderDisplayName ?? senderId;
  const id = remote.id ?? remote.clientId;
  const base = {
    id,
    clientId: remote.clientId,
    clientSeq: remote.clientSeq,
    senderId,
    senderName,
    createdAt: remote.serverCreatedAt ?? remote.createdAt,
    pendingSync: false,
  };

  const uiKind = remote.metadata?.uiKind as string | undefined;
  const quickStatus = remote.metadata?.quickStatus as IntercomQuickStatus | undefined;

  if (remote.type === 'voice' || uiKind === 'voice') {
    const durationSec = remote.audio?.durationSec ?? 1;
    return {
      ...base,
      kind: 'voice',
      durationSec,
      transcript: remote.body,
      waveform: buildFakeWaveform(durationSec * 1000),
    };
  }

  if (uiKind === 'status' && quickStatus) {
    return {
      ...base,
      kind: 'status',
      status: quickStatus,
      text: remote.body,
    };
  }

  if (remote.type === 'system' || uiKind === 'system') {
    return {
      ...base,
      kind: 'system',
      text: remote.body,
    };
  }

  return {
    ...base,
    kind: 'text',
    text: remote.body,
  };
}

export function apiPeerToUiPeer(
  peer: TripInTripCommsPeer,
  currentUserId?: string,
): IntercomPeer {
  let connection: IntercomPeerConnection = peer.connection === 'online' ? 'connected' : 'disconnected';
  if (currentUserId && peer.userId === currentUserId) connection = 'self';

  return {
    userId: peer.userId,
    displayName: connection === 'self' ? '你' : peer.displayName ?? peer.userId,
    connection,
    health: 'unknown',
    distanceMeters: peer.distanceMeters ?? undefined,
  };
}

export function mergeUiMessages(local: IntercomMessage[], incoming: IntercomMessage[]): IntercomMessage[] {
  const byKey = new Map<string, IntercomMessage>();
  for (const msg of local) {
    byKey.set(msg.clientId ?? msg.id, msg);
  }
  for (const msg of incoming) {
    byKey.set(msg.clientId ?? msg.id, msg);
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
