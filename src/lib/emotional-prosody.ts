import type { AudioProsody } from '@/types/emotional-context';
import { applyVoiceTone, ttsEngine } from '@/lib/tts-engine';

export { applyVoiceTone };

/** 应用 TTS 韵律（Web Speech API rate/pitch） */
export function applyTtsProsody(prosody: AudioProsody | undefined): void {
  if (!prosody) return;
  ttsEngine.applyProsody(prosody.speedFactor, prosody.pitch);
}
