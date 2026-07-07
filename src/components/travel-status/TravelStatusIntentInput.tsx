import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { workbenchNlSurface } from './travel-status-ui';
import type { TripIntentRouteResult } from '@/api/travel-status.types';

interface TravelStatusIntentInputProps {
  onPreview: (message: string) => void;
  onSubmit: (message: string) => Promise<TripIntentRouteResult>;
  preview: TripIntentRouteResult | null;
  isSubmitting?: boolean;
  className?: string;
}

function previewLabel(result: TripIntentRouteResult): string {
  if (result.decisionQueueHeadline) return result.decisionQueueHeadline;
  if (result.classification.label) return result.classification.label;
  return result.classification.kind;
}

export default function TravelStatusIntentInput({
  onPreview,
  onSubmit,
  preview,
  isSubmitting,
  className,
}: TravelStatusIntentInputProps) {
  const [message, setMessage] = useState('');

  const handleChange = (value: string) => {
    setMessage(value);
    onPreview(value);
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setMessage('');
  };

  return (
    <div className={cn(workbenchNlSurface, className)}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="例如：第 2 天风太大怎么办？"
            disabled={isSubmitting}
            className="h-10 border-border/60 bg-background pl-9"
          />
        </div>
        <Button
          size="default"
          className="h-10 shrink-0 px-4"
          onClick={() => void handleSubmit()}
          disabled={!message.trim() || isSubmitting}
        >
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {preview ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          预览 · {previewLabel(preview)}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          用自然语言提问、发起修改或查看决策状态
        </p>
      )}
    </div>
  );
}
