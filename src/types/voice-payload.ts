/** tripnara.voice_payload@v1 — TTS 全文 + 调音参数（诊断降维口语版） */
export type VoicePayloadSchema = 'tripnara.voice_payload@v1';

export type VoicePayloadPitchSetting = 'low' | 'mid' | 'high' | (string & {});

export interface VoicePayloadAudioConfig {
  /** 冲突场景 ≈ 0.85 */
  speed_factor: number;
  pitch_setting: VoicePayloadPitchSetting;
  voice_id?: string;
}

export interface VoicePayload {
  schema: VoicePayloadSchema;
  text: string;
  audio_config: VoicePayloadAudioConfig;
  tone_modifier?: string;
  [key: string]: unknown;
}

export function isVoicePayload(v: unknown): v is VoicePayload {
  return (
    typeof v === 'object' &&
    v != null &&
    (v as VoicePayload).schema === 'tripnara.voice_payload@v1' &&
    typeof (v as VoicePayload).text === 'string'
  );
}
