import type { AudioProsodyPitch } from '@/types/emotional-context';

export type TtsSpeakOptions = {
  rate?: number;
  pitch?: number;
  lang?: string;
  voiceId?: string;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
};

export type VoicePayloadSpeakConfig = {
  text: string;
  speedFactor?: number;
  pitchSetting?: AudioProsodyPitch | string;
  voiceId?: string;
  tone?: string;
};

let currentRate = 1;
let currentPitch = 1;
let speakingUtterance: SpeechSynthesisUtterance | null = null;

function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function pitchFromProsody(pitch: AudioProsodyPitch | string | undefined): number {
  if (pitch === 'low') return 0.9;
  if (pitch === 'high') return 1.1;
  return 1;
}

function resolveSpeechVoice(voiceId: string | undefined): SpeechSynthesisVoice | undefined {
  if (!voiceId?.trim() || !isSpeechSynthesisSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const needle = voiceId.trim().toLowerCase();
  return voices.find(
    (v) =>
      v.voiceURI.toLowerCase().includes(needle) ||
      v.name.toLowerCase().includes(needle)
  );
}

export function applyVoiceTone(tone: string | undefined): {
  theme: string;
  suppressEmoji?: boolean;
  suppressMarketing?: boolean;
  autoHideAssistantBubble?: boolean;
} {
  switch (tone) {
    case 'professional_authoritative':
      return { theme: 'calm-authority', suppressEmoji: true };
    case 'empathetic_reassurance':
      return { theme: 'warm-soft', suppressMarketing: true };
    case 'silent_observant':
      return { theme: 'minimal', autoHideAssistantBubble: true };
    default:
      return { theme: 'default' };
  }
}

export const ttsEngine = {
  isSupported(): boolean {
    return isSpeechSynthesisSupported();
  },

  getRate(): number {
    return currentRate;
  },

  getPitch(): number {
    return currentPitch;
  },

  setRate(rate: number): void {
    if (Number.isFinite(rate) && rate > 0) {
      currentRate = rate;
    }
  },

  setPitch(pitch: number): void {
    if (Number.isFinite(pitch) && pitch > 0) {
      currentPitch = pitch;
    }
  },

  applyProsody(speedFactor?: number, pitch?: AudioProsodyPitch): void {
    if (speedFactor != null) this.setRate(speedFactor);
    if (pitch != null) this.setPitch(pitchFromProsody(pitch));
  },

  /** Phase-4c：voice_payload + emotional_context 交叉校验后朗读 */
  speakVoicePayload(config: VoicePayloadSpeakConfig, options?: TtsSpeakOptions): boolean {
    if (config.tone) applyVoiceTone(config.tone);
    const rate = config.speedFactor ?? currentRate;
    const pitch = pitchFromProsody(config.pitchSetting);
    if (config.speedFactor != null) currentRate = rate;
    if (config.pitchSetting != null) currentPitch = pitch;
    return this.speak(config.text, {
      rate,
      pitch,
      voiceId: config.voiceId,
      ...options,
    });
  },

  cancel(): void {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    speakingUtterance = null;
  },

  speak(text: string, options?: TtsSpeakOptions): boolean {
    const trimmed = text.trim();
    if (!trimmed || !isSpeechSynthesisSupported()) return false;

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = options?.rate ?? currentRate;
    utterance.pitch = options?.pitch ?? currentPitch;
    utterance.lang = options?.lang ?? 'zh-CN';
    const voice = resolveSpeechVoice(options?.voiceId);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      speakingUtterance = null;
      options?.onEnd?.();
    };
    utterance.onerror = (ev) => {
      speakingUtterance = null;
      options?.onError?.(ev);
    };

    speakingUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  },
};

/** 便捷导出：与 §13.1 契约对齐 */
export function speakVoicePayload(
  config: VoicePayloadSpeakConfig,
  options?: TtsSpeakOptions
): boolean {
  return ttsEngine.speakVoicePayload(config, options);
}
