import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { buildSpeakerSlots } from '@/lib/collab-negotiation-stage';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import { cn } from '@/lib/utils';

interface CollabSpeakerOrderBarProps {
  detail: PreferenceRoundDetail | null;
  className?: string;
  variant?: 'compact' | 'stage';
}

export function CollabSpeakerOrderBar({
  detail,
  className,
  variant = 'compact',
}: CollabSpeakerOrderBarProps) {
  const slots = buildSpeakerSlots(detail);

  if (slots.length === 0) return null;

  if (variant === 'stage') {
    return (
      <section className={cn('space-y-2', className)} aria-label="发言顺序">
        <h4 className="text-xs font-semibold text-foreground">发言顺序</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <div
              key={slot.userId}
              className={cn(
                'flex flex-col items-center rounded-lg border px-2 py-2.5 text-center',
                slot.isCurrent
                  ? 'border-primary/35 bg-primary/[0.04]'
                  : 'border-border/60 bg-muted/10',
              )}
            >
              <CollaboratorAvatar
                displayName={slot.displayName}
                size="md"
                highlight={slot.isCurrent ? 'current' : slot.hasSpoken ? 'spoken' : 'none'}
              />
              <span className="mt-1.5 max-w-full truncate text-xs font-medium text-foreground">
                {slot.displayName}
              </span>
              <span
                className={cn(
                  'mt-0.5 text-[10px]',
                  slot.isCurrent ? 'font-medium text-primary' : 'text-muted-foreground',
                )}
              >
                {slot.isCurrent ? '下一位发言' : slot.hasSpoken ? '已发言' : '等待中'}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

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
