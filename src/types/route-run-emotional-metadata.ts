/** route_and_run metadata.emotional_realtime_signals */
export interface EmotionalRealtimeSignals {
  continuousDrivingSeconds?: number;
  stationaryMinutes?: number;
  /** 用户本地时间 HH:mm */
  localTime?: string;
}

export interface RouteRunEmotionalMetadata {
  emotional_realtime_signals?: EmotionalRealtimeSignals;
  /** 仅在后端确已同步离线地图时为 true */
  offline_maps_synced?: boolean;
  [key: string]: unknown;
}
