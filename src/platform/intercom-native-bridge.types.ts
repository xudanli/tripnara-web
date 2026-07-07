import type { IntercomMessage, IntercomQuickStatus } from '@/lib/team-intercom.util';

export interface NativeBluetoothPeer {
  deviceId: string;
  userId?: string;
  displayName: string;
  rssi?: number;
  distanceMeters?: number;
  connected: boolean;
}

export type IntercomPacketKind = 'voice' | 'status' | 'text';

export interface IntercomPacket {
  tripId: string;
  messageId: string;
  kind: IntercomPacketKind;
  senderId: string;
  senderName: string;
  createdAt: string;
  payload: {
    text?: string;
    status?: IntercomQuickStatus;
    durationSec?: number;
    transcript?: string;
    audioPath?: string;
  };
}

export interface PttRecordingResult {
  durationSec: number;
  audioPath?: string;
  audioBlob?: Blob;
}

export interface IntercomNativeBridge {
  readonly runtime: 'web' | 'capacitor';
  getNetworkConnected(): Promise<boolean>;
  startSession(tripId: string): Promise<void>;
  stopSession(): Promise<void>;
  getBluetoothPeers(): Promise<NativeBluetoothPeer[]>;
  broadcastPacket(packet: IntercomPacket): Promise<string[]>;
  subscribeIncoming(handler: (packet: IntercomPacket) => void): () => void;
  startPtt(): Promise<void>;
  stopPtt(): Promise<PttRecordingResult>;
  requestBluetoothPermissions(): Promise<boolean>;
}

export function packetToIntercomMessage(packet: IntercomPacket): IntercomMessage {
  const base = {
    id: packet.messageId,
    senderId: packet.senderId,
    senderName: packet.senderName,
    createdAt: packet.createdAt,
    pendingSync: false,
  };

  if (packet.kind === 'voice') {
    return {
      ...base,
      kind: 'voice',
      durationSec: packet.payload.durationSec ?? 1,
      transcript: packet.payload.transcript ?? '语音消息',
      waveform: [],
    };
  }

  if (packet.kind === 'status') {
    return {
      ...base,
      kind: 'status',
      status: packet.payload.status ?? 'wait',
      text: packet.payload.text ?? '',
    };
  }

  return {
    ...base,
    kind: 'text',
    text: packet.payload.text ?? '',
  };
}

export function intercomMessageToPacket(
  tripId: string,
  message: IntercomMessage,
): IntercomPacket | null {
  const base = {
    tripId,
    messageId: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    createdAt: message.createdAt,
  };

  if (message.kind === 'voice') {
    return {
      ...base,
      kind: 'voice',
      payload: {
        durationSec: message.durationSec,
        transcript: message.transcript,
      },
    };
  }

  if (message.kind === 'status') {
    return {
      ...base,
      kind: 'status',
      payload: { status: message.status, text: message.text },
    };
  }

  if (message.kind === 'text') {
    return {
      ...base,
      kind: 'text',
      payload: { text: message.text },
    };
  }

  return null;
}
