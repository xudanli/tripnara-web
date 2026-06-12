import type { AudioProsodyPitch } from '@/types/emotional-context';

export type TtsSpeakOptions = {
  rate?: number;
  pitch?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
};

let currentRate = 1;
let currentPitch = 1;
let speakingUtterance: SpeechSynthesisUtterance | null = null;

function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pitchFromProsody(pitch: AudioProsodyPitch | undefined): number {
  if (pitch === 'low') return 0.9;
  if (pitch === 'high') return 1.1;
  return 1;
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
