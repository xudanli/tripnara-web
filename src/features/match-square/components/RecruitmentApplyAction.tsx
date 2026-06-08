import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/match-square';
import { plazaCard } from '../lib/plaza-visual';
import {
  APPLICATION_STATUS_LABELS,
  blocksApplyAction,
} from '../lib/application-status';

interface RecruitmentApplyActionProps {
  applicationStatus?: ApplicationStatus;
  showApply?: boolean;
  teamworkBlocked?: boolean;
  teamworkBlockReason?: string | null;
  onApply?: () => void;
  primaryClassName?: string;
  /** 列表 Card 紧凑底栏 */
  compact?: boolean;
}

export function RecruitmentApplyAction({
  applicationStatus,
  showApply,
  teamworkBlocked,
  teamworkBlockReason,
  onApply,
  primaryClassName,
  compact = false,
}: RecruitmentApplyActionProps) {
  const actionsClass = cn(plazaCard.actions, 'items-center', compact && 'mt-0 shrink-0');
  const buttonClass = cn(compact ? 'h-7 shrink-0 px-3 text-xs' : 'flex-1', primaryClassName);

  if (teamworkBlocked) {
    if (compact) {
      return (
        <div className={cn(actionsClass, !compact && 'w-full')} data-no-card-nav>
          <Button variant="outline" className={buttonClass} size="sm" disabled>
            不可申请
          </Button>
        </div>
      );
    }

    return (
      <div className={cn(actionsClass, !compact && 'w-full')} data-no-card-nav>
        <p className="flex-1 text-xs text-amber-600 dark:text-amber-400">
          {teamworkBlockReason ?? '组队风格不匹配，暂不可申请'}
        </p>
      </div>
    );
  }
  if (applicationStatus && blocksApplyAction(applicationStatus)) {
    return (
      <div className={cn(actionsClass, !compact && 'w-full')} data-no-card-nav>
        <Button variant="outline" className={buttonClass} size={compact ? 'sm' : 'default'} disabled>
          {APPLICATION_STATUS_LABELS[applicationStatus]}
        </Button>
      </div>
    );
  }

  if (applicationStatus === 'rejected' || applicationStatus === 'withdrawn') {
    return (
      <div className={actionsClass} data-no-card-nav>
        {showApply && onApply ? (
          <>
            <Button className={buttonClass} size={compact ? 'sm' : 'default'} onClick={onApply}>
              再次申请
            </Button>
            {!compact && (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </>
        ) : (
          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {APPLICATION_STATUS_LABELS[applicationStatus]}
          </p>
        )}
      </div>
    );
  }

  if (showApply && onApply) {
    return (
      <div className={actionsClass} data-no-card-nav>
        <Button className={buttonClass} size={compact ? 'sm' : 'default'} onClick={onApply}>
          申请加入
        </Button>
        {!compact && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </div>
    );
  }

  return (
    <p className="flex shrink-0 items-center justify-end gap-1 text-[11px] text-muted-foreground">
      查看详情
      <ChevronRight className="h-3 w-3" aria-hidden />
    </p>
  );
}
