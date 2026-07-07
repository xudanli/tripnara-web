import { buildFakeWaveform } from '@/lib/team-intercom.util';
import type {
  IntercomNativeBridge,
  IntercomPacket,
  NativeBluetoothPeer,
  PttRecordingResult,
} from './intercom-native-bridge.types';

const TRIP_SERVICE_PREFIX = 'tripnara-intercom-';

/** 浏览器 / 开发环境：模拟蓝牙 P2P + MediaRecorder */
export class WebIntercomNativeBridge implements IntercomNativeBridge {
  readonly runtime = 'web' as const;

  private tripId: string | null = null;
  private peers: NativeBluetoothPeer[] = [];
  private incomingHandlers = new Set<(packet: IntercomPacket) => void>();
  private recordStartedAt = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private channel: BroadcastChannel | null = null;

  async getNetworkConnected(): Promise<boolean> {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async startSession(tripId: string): Promise<void> {
    this.tripId = tripId;
    this.peers = [
      { deviceId: 'web-self', displayName: '本机', connected: true, distanceMeters: 0 },
      { deviceId: 'web-sim-1', displayName: '模拟队友 A', connected: true, rssi: -62, distanceMeters: 420 },
      { deviceId: 'web-sim-2', displayName: '模拟队友 B', connected: true, rssi: -71, distanceMeters: 120 },
    ];

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel?.close();
      this.channel = new BroadcastChannel(`${TRIP_SERVICE_PREFIX}${tripId}`);
      this.channel.onmessage = (event: MessageEvent<IntercomPacket>) => {
        const packet = event.data;
        if (!packet || packet.tripId !== tripId) return;
        this.incomingHandlers.forEach((h) => h(packet));
      };
    }
  }

  async stopSession(): Promise<void> {
    this.tripId = null;
    this.peers = [];
    this.channel?.close();
    this.channel = null;
  }

  async getBluetoothPeers(): Promise<NativeBluetoothPeer[]> {
    return this.peers;
  }

  async broadcastPacket(packet: IntercomPacket): Promise<string[]> {
    this.channel?.postMessage(packet);
    return this.peers.filter((p) => p.connected && p.deviceId !== 'web-self').map((p) => p.deviceId);
  }

  subscribeIncoming(handler: (packet: IntercomPacket) => void): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  async startPtt(): Promise<void> {
    this.recordStartedAt = Date.now();
    this.audioChunks = [];
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.start();
    } catch {
      // 无麦克风时仍计时长
    }
  }

  async stopPtt(): Promise<PttRecordingResult> {
    const durationSec = Math.max(1, Math.round((Date.now() - this.recordStartedAt) / 1000));

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => resolve();
        this.mediaRecorder.stop();
      });
    }

    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;

    const audioBlob = this.audioChunks.length
      ? new Blob(this.audioChunks, { type: 'audio/webm' })
      : undefined;

    return { durationSec, audioBlob };
  }
}

export function createWebIntercomBridge(): IntercomNativeBridge {
  return new WebIntercomNativeBridge();
}

/** 用于演示：模拟收到一条蓝牙语音 */
export function simulateIncomingVoice(
  bridge: WebIntercomNativeBridge,
  packet: IntercomPacket,
): void {
  (bridge as unknown as { incomingHandlers: Set<(p: IntercomPacket) => void> }).incomingHandlers.forEach(
    (h) => h(packet),
  );
}

export function buildDemoVoicePacket(tripId: string): IntercomPacket {
  return {
    tripId,
    messageId: `rx-${Date.now()}`,
    kind: 'voice',
    senderId: 'web-sim-1',
    senderName: '模拟队友 A',
    createdAt: new Date().toISOString(),
    payload: {
      durationSec: 5,
      transcript: '蓝牙模拟：收到附近队友语音',
    },
  };
}

export function enrichVoiceWaveform(durationSec: number): number[] {
  return buildFakeWaveform(durationSec * 1000);
}
