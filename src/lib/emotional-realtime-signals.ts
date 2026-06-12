import { drivingDurationTracker, resolveJourneyTimezone } from '@/services/journeyPresenceReporter';
import { resolveEmergencyModeForMetadata } from '@/lib/emotional-emergency-mode';

const STATIONARY_THRESHOLD_DEG = 0.00015;
let lastMovementAtMs = Date.now();
let lastLat: number | undefined;
let lastLng: number | undefined;

/** GPS watch / heartbeat 调用：位移超阈值则重置静止计时 */
export function recordEmotionalGpsSample(lat: number, lng: number): void {
  if (
    lastLat != null &&
    lastLng != null &&
    Math.abs(lat - lastLat) <= STATIONARY_THRESHOLD_DEG &&
    Math.abs(lng - lastLng) <= STATIONARY_THRESHOLD_DEG
  ) {
    return;
  }
  lastLat = lat;
  lastLng = lng;
  lastMovementAtMs = Date.now();
}

export function getStationaryMinutes(): number {
  return Math.max(0, Math.floor((Date.now() - lastMovementAtMs) / 60_000));
}

export function formatLocalTimeHHmm(timezone?: string): string {
  const tz = timezone ?? resolveJourneyTimezone();
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

/** 同步构建实时传感器信号（规划前 route_and_run metadata 用） */
export function buildEmotionalRealtimeSignals(options?: {
  timezone?: string;
}): import('@/types/route-run-emotional-metadata').EmotionalRealtimeSignals {
  const signals: import('@/types/route-run-emotional-metadata').EmotionalRealtimeSignals = {
    continuousDrivingSeconds: drivingDurationTracker.elapsedSeconds,
    stationaryMinutes: getStationaryMinutes(),
    localTime: formatLocalTimeHHmm(options?.timezone),
  };
  if (resolveEmergencyModeForMetadata()) {
    signals.emergency_mode = true;
  }
  return signals;
}
