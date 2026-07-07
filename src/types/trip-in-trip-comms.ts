/** 行中团队对讲 API 契约 — 对齐后端 P2.0 */

export type CommsMessageType = 'text' | 'voice' | 'location_pin' | 'system';

export interface CommsMessageAudio {
  url?: string;
  durationSec?: number;
  mimeType?: string;
  transcriptId?: string;
}

export interface CommsMessageLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface TripInTripCommsMessage {
  id?: string;
  clientId: string;
  tripId?: string;
  senderId?: string;
  senderDisplayName?: string;
  clientSeq: number;
  type: CommsMessageType;
  body: string;
  audio?: CommsMessageAudio;
  location?: CommsMessageLocation;
  createdAt: string;
  serverCreatedAt?: string;
  readBy?: string[];
  metadata?: Record<string, unknown>;
}

export interface TripInTripCommsPeer {
  userId: string;
  displayName?: string;
  distanceMeters: number | null;
  lastSeenAt: string;
  connection: 'online' | 'offline';
  lastLocation?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
  };
}

export interface CommsSyncRequest {
  messages: Array<{
    clientId: string;
    clientSeq: number;
    type: CommsMessageType;
    body: string;
    audio?: CommsMessageAudio;
    location?: CommsMessageLocation;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
  lastKnownServerSeq?: number;
}

export interface CommsSyncResponse {
  syncedIds: string[];
  serverMessages: TripInTripCommsMessage[];
  latestServerSeq: number;
  syncedAt: string;
  warnings?: Array<{ clientId: string; code: string }>;
}

export interface CommsListResponse {
  messages: TripInTripCommsMessage[];
  latestServerSeq: number;
  hasMore: boolean;
  nextBefore: string | null;
}

export interface CommsPeersResponse {
  peers: TripInTripCommsPeer[];
  referencePoint?: {
    lat: number;
    lng: number;
    source: 'self' | 'next_stop' | 'explicit';
  };
  asOf: string;
}

export interface CommsHeartbeatRequest {
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  clientTimestamp: string;
  shareLocation: boolean;
}

export interface CommsHeartbeatResponse {
  accepted: boolean;
  ttlSec: number;
}

export interface CommsSummaryResponse {
  tripId: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  bullets: string[];
  sourceMessageIds?: string[];
  degraded?: boolean;
  reason?: string;
}

export interface CommsTranscribeResponse {
  transcriptId: string;
  transcript: string;
  durationSec: number;
  language?: string;
  confidence?: number;
}
