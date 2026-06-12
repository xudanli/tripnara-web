import { useCallback, useEffect } from 'react';
import { applyVoiceTone, ttsEngine } from '@/lib/tts-engine';
import { isKernelTaggedNarrationTip, playVoicePayloadNarration } from '@/lib/voice-payload-ui';
import { useEmotionContextStore } from '@/store/emotionContextStore';

/** 绑定 emotionalContext / voice_payload → TTS；优先 voice_payload.text，不读内核 tips */
export function useTtsEmotionalProsody(options?: { autoSpeakVoice?: boolean }) {
  const emotionalContext = useEmotionContextStore((s) => s.emotionalContext);
  const voicePayload = useEmotionContextStore((s) => s.voicePayload);
  const audioProsody = emotionalContext?.audioProsody;
  const voiceToneModifier = emotionalContext?.voiceToneModifier;
  const userFriendlySummary = emotionalContext?.userFriendlySummary;

  useEffect(() => {
    if (voicePayload?.audio_config) {
      ttsEngine.applyProsody(
        voicePayload.audio_config.speed_factor,
        voicePayload.audio_config.pitch_setting === 'low' ||
          voicePayload.audio_config.pitch_setting === 'mid' ||
          voicePayload.audio_config.pitch_setting === 'high'
          ? voicePayload.audio_config.pitch_setting
          : 'low'
      );
      return;
    }
    if (!audioProsody) return;
    ttsEngine.applyProsody(audioProsody.speedFactor, audioProsody.pitch);
  }, [
    voicePayload?.audio_config?.speed_factor,
    voicePayload?.audio_config?.pitch_setting,
    audioProsody?.speedFactor,
    audioProsody?.pitch,
  ]);

  useEffect(() => {
    if (!options?.autoSpeakVoice) return;
    if (!ttsEngine.isSupported()) return;

    if (voicePayload?.text?.trim()) {
      playVoicePayloadNarration(voicePayload, emotionalContext);
      return;
    }

    const summary = userFriendlySummary?.trim();
    if (!summary || isKernelTaggedNarrationTip(summary)) return;
    ttsEngine.speak(summary);
  }, [options?.autoSpeakVoice, voicePayload, emotionalContext, userFriendlySummary]);

  const voiceTheme = applyVoiceTone(voiceToneModifier);

  const speak = useCallback(
    (text: string, lang = 'zh-CN') => {
      if (!text.trim() || isKernelTaggedNarrationTip(text)) return false;
      return ttsEngine.speak(text.trim(), { lang });
    },
    []
  );

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
