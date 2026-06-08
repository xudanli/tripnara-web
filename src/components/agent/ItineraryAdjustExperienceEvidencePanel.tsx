import type { ItineraryAdjustExperienceValidation } from '@/lib/itinerary-adjust-response';
import { itineraryAdjustExperienceEvidenceLayers } from '@/lib/itinerary-adjust-response';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export function ItineraryAdjustExperienceEvidencePanel({
  validation,
  debugUiDefaults,
  className,
  tone = 'default',
}: {
  validation: ItineraryAdjustExperienceValidation;
  debugUiDefaults?: boolean;
  className?: string;
  tone?: 'default' | 'schedule';
}) {
  const layers = itineraryAdjustExperienceEvidenceLayers(validation);
  if (!layers.length) return null;

  const isSchedule = tone === 'schedule';

  return (
    <details
      className={cn(
        'group rounded-md border text-[11px]',
        isSchedule
          ? 'border-amber-200/70 bg-background/70 dark:border-amber-800/40'
          : 'border-border/60 bg-background/80',
        className
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 font-medium select-none [&::-webkit-details-marker]:hidden',
          isSchedule ? 'text-amber-950/90 dark:text-amber-100/90' : 'text-foreground/90'
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
        <span>体验依据详情</span>
        <span className="font-normal text-muted-foreground">（理性事实账本）</span>
      </summary>
      <div className="space-y-2 border-t border-border/50 px-2.5 py-2">
        {debugUiDefaults && validation.region_profile ? (
          <p className="font-mono text-[9px] text-muted-foreground">
            region: {validation.region_profile}
            {validation.reasoning_type ? ` · ${validation.reasoning_type}` : ''}
          </p>
        ) : null}
        <ul className="space-y-2">
          {layers.map((layer) => (
            <li key={layer.key}>
              <p
                className={cn(
                  'text-[10px] font-semibold',
                  isSchedule ? 'text-amber-900/80 dark:text-amber-200/80' : 'text-foreground/75'
                )}
              >
                {layer.label}
              </p>
              <p
                className={cn(
                  'mt-0.5 leading-relaxed',
                  isSchedule ? 'text-amber-950/85 dark:text-amber-100/85' : 'text-foreground/90'
                )}
              >
                {layer.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
