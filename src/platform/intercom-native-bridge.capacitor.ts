import { buildFakeWaveform } from '@/lib/team-intercom.util';
import type {
  IntercomNativeBridge,
  IntercomPacket,
  NativeBluetoothPeer,
  PttRecordingResult,
} from './intercom-native-bridge.types';

const INTERCOM_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const INTERCOM_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
const PACKET_MAX_BYTES = 512;

function encodePacket(packet: IntercomPacket): string {
  const json = JSON.stringify(packet);
  if (json.length > PACKET_MAX_BYTES) {
    throw new Error('INTERCOM_PACKET_TOO_LARGE');
  }
  return json;
}

function decodePacket(raw: string): IntercomPacket | null {
  try {
    return JSON.parse(raw) as IntercomPacket;
  } catch {
    return null;
  }
}

function tripAdvertiseName(tripId: string): string {
  return `TN-${tripId.slice(0, 8)}`;
}

/**
 * Capacitor 套壳实现：
 * - Network 插件检测联网（仅影响云同步，不影响蓝牙对讲）
 * - Bluetooth LE 广播/扫描同行程队友（小数据包 P2P）
 * - PTT 仍走 WebView MediaRecorder（需 Info.plist / Android 麦克风权限）
 */
export class CapacitorIntercomNativeBridge implements IntercomNativeBridge {
  readonly runtime = 'capacitor' as const;

  private tripId: string | null = null;
  private peers = new Map<string, NativeBluetoothPeer>();
  private incomingHandlers = new Set<(packet: IntercomPacket) => void>();
  private recordStartedAt = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private scanHandle: { remove: () => Promise<void> } | null = null;
  private notifyHandles = new Map<string, { remove: () => Promise<void> }>();
  private bleInitialized = false;

  private async getNetworkPlugin() {
    const { Network } = await import('@capacitor/network');
    return Network;
  }

  private async getBlePlugin() {
    const { BleClient } = await import('@capacitor-community/bluetooth-le');
    return BleClient;
  }

  async getNetworkConnected(): Promise<boolean> {
    try {
      const Network = await this.getNetworkPlugin();
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    try {
      const BleClient = await this.getBlePlugin();
      if (!this.bleInitialized) {
        await BleClient.initialize({ androidNeverForLocation: true });
        this.bleInitialized = true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async startSession(tripId: string): Promise<void> {
    this.tripId = tripId;
    this.peers.clear();
    this.peers.set('self', {
      deviceId: 'self',
      displayName: '本机',
      connected: true,
      distanceMeters: 0,
    });

    try {
      const BleClient = await this.getBlePlugin();
      if (!this.bleInitialized) {
        await BleClient.initialize({ androidNeverForLocation: true });
        this.bleInitialized = true;
      }

      await BleClient.requestLEScan({
        services: [INTERCOM_SERVICE_UUID],
        allowDuplicates: true,
        namePrefix: 'TN-',
      });

      this.scanHandle = await BleClient.addListener('onScanResult', (result) => {
        const device = result?.device;
        if (!device?.deviceId) return;
        const name = device.name ?? result.localName ?? '';
        if (!name.startsWith('TN-')) return;

        const rssi = result.rssi ?? -80;
        const distanceMeters = Math.max(10, Math.round(Math.pow(10, (-59 - rssi) / (10 * 2))));

        this.peers.set(device.deviceId, {
          deviceId: device.deviceId,
          displayName: name,
          rssi,
          distanceMeters,
          connected: true,
        });
      });
    } catch (err) {
      console.warn('[intercom] BLE session start failed, falling back to local-only', err);
    }
  }

  async stopSession(): Promise<void> {
    try {
      const BleClient = await this.getBlePlugin();
      await this.scanHandle?.remove();
      this.scanHandle = null;
      await BleClient.stopLEScan();
      for (const handle of this.notifyHandles.values()) {
        await handle.remove();
      }
      this.notifyHandles.clear();
    } catch {
      // ignore
    }
    this.tripId = null;
    this.peers.clear();
  }

  async getBluetoothPeers(): Promise<NativeBluetoothPeer[]> {
    return Array.from(this.peers.values());
  }

  async broadcastPacket(packet: IntercomPacket): Promise<string[]> {
    const delivered: string[] = [];
    try {
      const BleClient = await this.getBlePlugin();
      const encoded = encodePacket(packet);

      for (const peer of this.peers.values()) {
        if (peer.deviceId === 'self' || !peer.connected) continue;
        try {
          await BleClient.connect({ deviceId: peer.deviceId });
          if (!this.notifyHandles.has(peer.deviceId)) {
            await BleClient.startNotifications({
              deviceId: peer.deviceId,
              service: INTERCOM_SERVICE_UUID,
              characteristic: INTERCOM_CHAR_UUID,
            });
            const handle = await BleClient.addListener(peer.deviceId, (event) => {
              const raw = typeof event.value === 'string' ? event.value : '';
              const parsed = decodePacket(raw);
              if (!parsed || parsed.tripId !== this.tripId) return;
              this.incomingHandlers.forEach((h) => h(parsed));
            });
            this.notifyHandles.set(peer.deviceId, handle);
          }
          await BleClient.write({
            deviceId: peer.deviceId,
            service: INTERCOM_SERVICE_UUID,
            characteristic: INTERCOM_CHAR_UUID,
            value: encoded,
          });
          delivered.push(peer.deviceId);
        } catch {
          // peer may have left range
        }
      }
    } catch (err) {
      console.warn('[intercom] BLE broadcast failed', err);
    }
    return delivered;
  }

  subscribeIncoming(handler: (packet: IntercomPacket) => void): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  async startPtt(): Promise<void> {
    this.recordStartedAt = Date.now();
    this.audioChunks = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.start();
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
      ? new Blob(this.audioChunks, { type: 'audio/mp4' })
      : undefined;

    let audioPath: string | undefined;
    if (audioBlob && this.tripId) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const key = `intercom-audio:${this.tripId}:${Date.now()}`;
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] ?? '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        await Preferences.set({ key, value: base64 });
        audioPath = key;
      } catch {
        // keep blob only
      }
    }

    return { durationSec, audioBlob, audioPath };
  }
}

export function createCapacitorIntercomBridge(): IntercomNativeBridge {
  return new CapacitorIntercomNativeBridge();
}

export function buildVoiceWaveform(durationSec: number): number[] {
  return buildFakeWaveform(durationSec * 1000);
}

export { tripAdvertiseName, INTERCOM_SERVICE_UUID };
