import { useNavigate } from 'react-router-dom';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import { Lock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import type { InTripAnchorSnapshotPublic } from '@/types/in-trip-execution';
import { cn } from '@/lib/utils';

interface InTripAnchorBarProps {
  snapshot: InTripAnchorSnapshotPublic | null;
  loading?: boolean;
  className?: string;
  /** 行内轻量协商（替代跳转规划工作台） */
  onTeamFrictionClick?: () => void;
}

export function InTripAnchorBar({ snapshot, loading, className, onTeamFrictionClick }: InTripAnchorBarProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={cn('border-b bg-muted/30 px-4 sm:px-6 py-2', className)}>
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
    );
  }

  if (!snapshot) return null;

  const { budget, itinerary, team } = snapshot;

  return (
    <div
      className={cn(
        'border-b bg-muted/30 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" aria-hidden />
      <span className="font-medium text-foreground">已锁定</span>
      <span>
        {formatCurrency(budget.total, budget.currency)}
      </span>
      <span aria-hidden>·</span>
      <span>{itinerary.dayCount} 天</span>
      <span aria-hidden>·</span>
      <span>{itinerary.itemCount} 项行程</span>
      {budget.splitMechanismLocked && (
        <>
          <span aria-hidden>·</span>
          <Badge variant="outline" className="h-5 text-[10px] px-1.5">
            分摊已锁定
          </Badge>
        </>
      )}
      <span className="hidden sm:inline-flex items-center gap-1 ml-auto">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {team.memberCount} 人
        {team.highRiskAlertCount > 0 && (
          <button
            type="button"
            className="text-amber-700 underline-offset-2 hover:underline"
            onClick={() => {
              if (onTeamFrictionClick) {
                onTeamFrictionClick();
              } else {
                navigate(buildCollabCenterPlanStudioUrl(snapshot.tripId));
              }
            }}
          >
            · {team.highRiskAlertCount} 项摩擦预警
          </button>
        )}
      </span>
    </div>
  );
}
