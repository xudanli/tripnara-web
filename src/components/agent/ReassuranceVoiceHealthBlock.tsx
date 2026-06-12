/**
 * Phase-4c 暖心语音 + 住宿健康度（诊断降维）
 */

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VoiceNarrationPlayButton } from '@/components/agent/VoiceNarrationPlayButton';
import { AccommodationHealthPanel } from '@/components/agent/AccommodationHealthPanel';
import type { AccommodationHealthNight, AccommodationHealthPayload } from '@/types/accommodation-health';
import type { EmotionalContextClient } from '@/types/emotional-context';
import type { VoicePayload } from '@/types/voice-payload';

export interface ReassuranceVoiceHealthBlockProps {
  voicePayload?: VoicePayload | null;
  accommodationHealth?: AccommodationHealthPayload | null;
  emotionalContext?: EmotionalContextClient | null;
  disabled?: boolean;
  className?: string;
}

export function ReassuranceVoiceHealthBlock({
  voicePayload,
  accommodationHealth,
  emotionalContext,
  disabled,
  className,
}: ReassuranceVoiceHealthBlockProps) {
  const hasVoice = Boolean(voicePayload?.text?.trim());
  const hasHealth = Boolean(accommodationHealth?.nights?.length);
  if (!hasVoice && !hasHealth) return null;

  const handleMissingNight = (night: AccommodationHealthNight) => {
    toast.message(night.cta_label_zh?.trim() || '请在下方住宿列表挑选并加入行程', {
      description: nightTitleForToast(night),
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {hasVoice && voicePayload ? (
        <VoiceNarrationPlayButton
          voice={voicePayload}
          emotionalContext={emotionalContext}
          disabled={disabled}
        />
      ) : null}
      {hasHealth && accommodationHealth ? (
        <AccommodationHealthPanel
          health={accommodationHealth}
          disabled={disabled}
          onMissingNightAction={handleMissingNight}
        />
      ) : null}
    </div>
  );
}

function nightTitleForToast(night: AccommodationHealthNight): string {
  return night.label_zh?.trim() || night.date_label_zh?.trim() || `第 ${night.night_index} 晚`;
}
