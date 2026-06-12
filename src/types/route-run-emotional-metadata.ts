/** route_and_run metadata.emotional_realtime_signals */
export interface EmotionalRealtimeSignals {
  continuousDrivingSeconds?: number;
  stationaryMinutes?: number;
  /** 用户本地时间 HH:mm */
  localTime?: string;
  /** 行中一键应急 / 锚定会话 */
  emergency_mode?: boolean;
}

export interface RouteRunEmotionalMetadata {
  emotional_realtime_signals?: EmotionalRealtimeSignals;
  /** assembler 回放镜像（次优先于 ui_display.emotional_context） */
  emotional_context?: import('@/types/emotional-context').EmotionalContextClient;
  /** 仅在后端确已同步离线地图时为 true */
  offline_maps_synced?: boolean;
  [key: string]: unknown;
}
