import { journeyAssistantApi } from '@/api/assistant';
import {
  applyEmotionalContextSideEffects,
  normalizeEmotionalContext,
} from '@/lib/emotional-context-ui';
import type { JourneyPresenceContext } from '@/types/journey-presence';
import { getCurrentPosition } from '@/utils/geo';
import { recordEmotionalGpsSample } from '@/lib/emotional-realtime-signals';

const HEARTBEAT_MESSAGE = '·';

/** 车载/导航 SDK 可写入；默认 0 */
let continuousDrivingSeconds = 0;

export const drivingDurationTracker = {
  get elapsedSeconds(): number {
    return continuousDrivingSeconds;
  },
  setElapsedSeconds(seconds: number): void {
    if (Number.isFinite(seconds) && seconds >= 0) {
      continuousDrivingSeconds = Math.floor(seconds);
    }
  },
  reset(): void {
    continuousDrivingSeconds = 0;
  },
};

export function resolveJourneyTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** 组装 journey-assistant 请求的 context */
export async function buildJourneyPresenceContext(options?: {
  location?: { lat: number; lng: number };
  skipGps?: boolean;
}): Promise<JourneyPresenceContext> {
  const timezone = resolveJourneyTimezone();
  let currentLocation = options?.location;

  if (!currentLocation && !options?.skipGps) {
    try {
      currentLocation = await getCurrentPosition({ maximumAge: 60_000, timeout: 5_000 });
      if (currentLocation) {
        recordEmotionalGpsSample(currentLocation.lat, currentLocation.lng);
      }
    } catch {
      // GPS 不可用时仍上报时区 + 驾驶时长
    }
  }

  return {
    ...(currentLocation ? { currentLocation } : {}),
    timezone,
    continuousDrivingSeconds: drivingDurationTracker.elapsedSeconds,
  };
}

function applyEmotionalContextFromJourneyResponse(raw: unknown): void {
  const ctx = normalizeEmotionalContext(raw);
  if (ctx) applyEmotionalContextSideEffects(ctx);
}

export type JourneyPresenceHeartbeatOptions = {
  tripId: string;
  userId: string;
  intervalMs?: number;
  /** 位移超过此阈值（度）时额外 ping，默认 ~0.0003 ≈ 30m */
  displacementThreshold?: number;
};

/**
 * 前台 heartbeat：每 60s 或 GPS 位移变化时 ping chat，刷新 proactivityGate。
 * 不写入聊天 UI（直接调 API）。
 */
export function startJourneyPresenceHeartbeat(
  options: JourneyPresenceHeartbeatOptions
): () => void {
  const intervalMs = options.intervalMs ?? 60_000;
  const displacementThreshold = options.displacementThreshold ?? 0.0003;
  let lastLat: number | undefined;
  let lastLng: number | undefined;
  let disposed = false;

  const ping = async () => {
    if (disposed || !options.tripId || !options.userId) return;

    const context = await buildJourneyPresenceContext();
    const loc = context.currentLocation;
    if (loc) {
      recordEmotionalGpsSample(loc.lat, loc.lng);
      lastLat = loc.lat;
      lastLng = loc.lng;
    }

    try {
      const response = await journeyAssistantApi.chat({
        tripId: options.tripId,
        userId: options.userId,
        message: HEARTBEAT_MESSAGE,
        language: 'zh',
        context,
      });

      const state = response.journeyState as
        | { emotionalContext?: unknown; emotional_context?: unknown }
        | undefined;
      applyEmotionalContextFromJourneyResponse(
        state?.emotionalContext ?? state?.emotional_context
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[journey-presence-heartbeat]', err);
      }
    }
  };

  void ping();
  const intervalId = setInterval(() => void ping(), intervalMs);

  // 位移变化监听：位置 watch 不可用时依赖定时 ping
  let watchId: number | undefined;
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        recordEmotionalGpsSample(lat, lng);
        if (
          lastLat != null &&
          lastLng != null &&
          (Math.abs(lat - lastLat) > displacementThreshold ||
            Math.abs(lng - lastLng) > displacementThreshold)
        ) {
          void ping();
        }
        lastLat = lat;
        lastLng = lng;
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  return () => {
    disposed = true;
    clearInterval(intervalId);
    if (watchId != null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
