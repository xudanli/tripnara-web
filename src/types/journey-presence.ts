import type { Location } from '@/api/assistant';

/** 行中 / journey-assistant 请求 context — GPS + 时区 + 驾驶时长 */
export interface JourneyPresenceContext {
  currentLocation?: Location;
  timezone?: string;
  continuousDrivingSeconds?: number;
}
