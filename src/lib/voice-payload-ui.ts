import type { RouteAndRunResponse } from '@/api/agent';
import type { EmotionalContextClient } from '@/types/emotional-context';
import { isVoicePayload, type VoicePayload } from '@/types/voice-payload';
import { getEmotionContextStoreState } from '@/store/emotionContextStore';
import { speakVoicePayload } from '@/lib/tts-engine';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeAudioConfig(v: unknown): VoicePayload['audio_config'] | null {
  if (!isRecord(v)) return null;
  const speed_factor =
    pickNum(v.speed_factor) ?? pickNum(v.speedFactor) ?? 0.85;
  const pitchRaw = pickStr(v.pitch_setting) ?? pickStr(v.pitchSetting) ?? 'low';
  const pitch_setting =
    pitchRaw === 'low' || pitchRaw === 'mid' || pitchRaw === 'high' ? pitchRaw : pitchRaw;

  return {
    speed_factor,
    pitch_setting,
    ...(pickStr(v.voice_id) ?? pickStr(v.voiceId)
      ? { voice_id: pickStr(v.voice_id) ?? pickStr(v.voiceId) }
      : {}),
  };
}

export function normalizeVoicePayload(raw: unknown): VoicePayload | null {
  if (!isVoicePayload(raw)) return null;

  const text = pickStr(raw.text);
  if (!text) return null;

  const audio_config = normalizeAudioConfig(raw.audio_config ?? raw.audioConfig);
  if (!audio_config) return null;

  return {
    schema: 'tripnara.voice_payload@v1',
    text,
    audio_config,
    ...(pickStr(raw.tone_modifier) ?? pickStr(raw.toneModifier)
      ? { tone_modifier: pickStr(raw.tone_modifier) ?? pickStr(raw.toneModifier) }
      : {}),
  };
}

function pickRawVoicePayload(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.voice_payload ?? uiDisplay?.voicePayload;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.voice_payload ?? narration?.voicePayload;
}

export function pickVoicePayloadFromRouteRun(response: RouteAndRunResponse): VoicePayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return normalizeVoicePayload(pickRawVoicePayload(payload));
}

export function hasVoicePayloadUi(voice: VoicePayload | null | undefined): boolean {
  return Boolean(voice?.text?.trim());
}

/** narration.tips 中带内核标签的条目不可直接 TTS */
export function isKernelTaggedNarrationTip(tip: string): boolean {
  const t = tip.trim();
  if (!t) return false;
  if (t.startsWith('[安全贴士]') || t.startsWith('[内核提示]')) return true;
  if (/distance_to_anchor_km/i.test(t)) return true;
  if (t.includes('结构性缺口')) return true;
  return false;
}

export function applyVoicePayloadSideEffects(voice: VoicePayload | null): void {
  getEmotionContextStoreState().setVoicePayload(voice);
}

/** 交叉校验 emotional_context.voiceToneModifier 与 voice_payload */
export function resolveVoiceSpeakTone(
  voice: VoicePayload,
  emotionalContext?: EmotionalContextClient | null
): string | undefined {
  return emotionalContext?.voiceToneModifier ?? voice.tone_modifier;
}

export function playVoicePayloadNarration(
  voice: VoicePayload,
  emotionalContext?: EmotionalContextClient | null
): boolean {
  return speakVoicePayload({
    text: voice.text,
    speedFactor: voice.audio_config.speed_factor,
    pitchSetting: voice.audio_config.pitch_setting,
    voiceId: voice.audio_config.voice_id,
    tone: resolveVoiceSpeakTone(voice, emotionalContext),
  });
}
