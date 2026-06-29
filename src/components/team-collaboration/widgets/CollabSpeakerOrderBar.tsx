import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { buildSpeakerSlots } from '@/lib/collab-negotiation-stage';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import { cn } from '@/lib/utils';

interface CollabSpeakerOrderBarProps {
  detail: PreferenceRoundDetail | null;
  className?: string;
}

export function CollabSpeakerOrderBar({ detail, className }: CollabSpeakerOrderBarProps) {
  const slots = buildSpeakerSlots(detail);

  if (slots.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)} aria-label="发言顺序">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        发言顺序
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {slots.map((slot, index) => (
          <div key={slot.userId} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-[10px] text-muted-foreground/50" aria-hidden>
                →
              </span>
            ) : null}
            <div className="flex flex-col items-center gap-0.5">
              <CollaboratorAvatar
                displayName={slot.displayName}
                size="md"
                highlight={
                  slot.isCurrent ? 'current' : slot.hasSpoken ? 'spoken' : 'none'
                }
              />
              <span
                className={cn(
                  'max-w-[4.5rem] truncate text-[10px]',
                  slot.isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {slot.displayName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
