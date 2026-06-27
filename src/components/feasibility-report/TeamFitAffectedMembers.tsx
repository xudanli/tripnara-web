import { Badge } from '@/components/ui/badge';
import { resolveAffectedMemberChips } from '@/lib/feasibility-team-fit.util';
import { cn } from '@/lib/utils';

export interface TeamFitAffectedMembersProps {
  memberIds?: string[];
  nameById?: Record<string, string>;
  compact?: boolean;
  className?: string;
}

export default function TeamFitAffectedMembers({
  memberIds,
  nameById,
  compact = false,
  className,
}: TeamFitAffectedMembersProps) {
  const chips = resolveAffectedMemberChips(memberIds, nameById);
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
        涉及成员
      </span>
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="outline"
          className={cn(
            'font-normal border-violet-200 bg-violet-50/60 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100',
            compact ? 'text-[10px] h-5 px-1.5' : 'text-[11px] h-5',
          )}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}
