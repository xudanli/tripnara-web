/**
 * 「播放语音解说」— 优先朗读 voice_payload.text，不读 narration 内核 tips
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playVoicePayloadNarration } from '@/lib/voice-payload-ui';
import { ttsEngine } from '@/lib/tts-engine';
import type { EmotionalContextClient } from '@/types/emotional-context';
import type { VoicePayload } from '@/types/voice-payload';
import { Loader2, Square, Volume2 } from 'lucide-react';

export interface VoiceNarrationPlayButtonProps {
  voice: VoicePayload;
  emotionalContext?: EmotionalContextClient | null;
  disabled?: boolean;
  className?: string;
}

export function VoiceNarrationPlayButton({
  voice,
  emotionalContext,
  disabled,
  className,
}: VoiceNarrationPlayButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const supported = ttsEngine.isSupported();

  useEffect(() => {
    return () => {
      if (speaking) ttsEngine.cancel();
    };
  }, [speaking]);

  const handlePlay = useCallback(() => {
    if (!supported || disabled) return;
    setSpeaking(true);
    const ok = playVoicePayloadNarration(voice, emotionalContext);
    if (!ok) {
      setSpeaking(false);
      return;
    }
    window.setTimeout(() => setSpeaking(false), Math.max(3000, voice.text.length * 120));
  }, [disabled, emotionalContext, supported, voice]);

  const handleStop = useCallback(() => {
    ttsEngine.cancel();
    setSpeaking(false);
  }, []);

  if (!supported) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        size="sm"
        variant={speaking ? 'secondary' : 'default'}
        disabled={disabled}
        className="h-8 rounded-full text-xs gap-1.5"
        onClick={speaking ? handleStop : handlePlay}
      >
        {speaking ? (
          <>
            <Square className="h-3.5 w-3.5" aria-hidden />
            停止解说
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            播放语音解说
          </>
        )}
      </Button>
      {speaking ? (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          语速 {voice.audio_config.speed_factor.toFixed(2)} · 暖心语气
        </span>
      ) : null}
    </div>
  );
}
