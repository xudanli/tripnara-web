/** 主动通知门控 — 与 JourneyAssistant / cron push 规则一致 */
export type ProactivityGate = 'SILENT' | 'GENTLE' | 'ACTIVE' | 'FULL';

/** tripnara.emotional_context.client@v1（出站投影） */
export type EmotionalContextClientSchema = 'tripnara.emotional_context.client@v1';

/** tripnara.emotional_context@v1（编排内部，回放兼容） */
export type EmotionalContextInternalSchema = 'tripnara.emotional_context@v1';

export type EmotionalContextSchema =
  | EmotionalContextClientSchema
  | EmotionalContextInternalSchema
  | (string & {});

export type AudioProsodyPitch = 'low' | 'mid' | 'high';

export interface AudioProsody {
  /** 0.85 = 放慢约 15% */
  speedFactor: number;
  pitch: AudioProsodyPitch;
}

export interface AmbienceSignals {
  weatherWindLockActive?: boolean;
  [key: string]: unknown;
}

/** 前端消费的情绪上下文投影（服务端为准，勿本地复算 fatigue/anxiety） */
export interface EmotionalContextClient {
  /** tripnara.emotional_context.client@v1 */
  schema?: EmotionalContextSchema;
  anxietyTriggered?: boolean;
  voiceToneModifier?: string;
  proactivityGate?: ProactivityGate;
  audioProsody?: AudioProsody;
  ambienceSignals?: AmbienceSignals;
  /** narration.user_friendly_summary 镜像（锚定模式常以「别慌，有我在。」开头） */
  userFriendlySummary?: string;
  [key: string]: unknown;
}
