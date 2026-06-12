import { useCallback, useEffect } from 'react';
import { applyVoiceTone, ttsEngine } from '@/lib/tts-engine';
import { useEmotionContextStore } from '@/store/emotionContextStore';

/** 绑定 emotionalContext.audioProsody → TTS rate/pitch；可选朗读摘要 */
export function useTtsEmotionalProsody(options?: { autoSpeakSummary?: boolean }) {
  const emotionalContext = useEmotionContextStore((s) => s.emotionalContext);
  const audioProsody = emotionalContext?.audioProsody;
  const voiceToneModifier = emotionalContext?.voiceToneModifier;
  const userFriendlySummary = emotionalContext?.userFriendlySummary;

  useEffect(() => {
    if (!audioProsody) return;
    ttsEngine.applyProsody(audioProsody.speedFactor, audioProsody.pitch);
  }, [audioProsody?.speedFactor, audioProsody?.pitch]);

  useEffect(() => {
    if (!options?.autoSpeakSummary || !userFriendlySummary?.trim()) return;
    if (!ttsEngine.isSupported()) return;
    ttsEngine.speak(userFriendlySummary.trim());
  }, [options?.autoSpeakSummary, userFriendlySummary]);

  const voiceTheme = applyVoiceTone(voiceToneModifier);

  const speak = useCallback((text: string, lang = 'zh-CN') => {
    if (!text.trim()) return false;
    return ttsEngine.speak(text.trim(), { lang });
  }, []);

  const cancel = useCallback(() => {
    ttsEngine.cancel();
  }, []);

  return {
    isSupported: ttsEngine.isSupported(),
    rate: ttsEngine.getRate(),
    pitch: ttsEngine.getPitch(),
    voiceTheme,
    speak,
    cancel,
  };
}
