import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  HelpCircle,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/common/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkbenchFeasibilityRing } from '@/components/plan-studio/workbench/WorkbenchFeasibilityRing';
import {
  journeyMapAiBadge,
  journeyMapFocusRing,
  workbenchHeaderShell,
} from '../journey-map-ui';
import { toast } from 'sonner';

export interface FullJourneyMapHeaderProps {
  tripTitle: string;
  subtitle?: string;
  feasibilityScore: number;
  tripId?: string | null;
  onDiscussWithNara?: () => void;
  className?: string;
}

export function FullJourneyMapHeader({
  tripTitle,
  subtitle,
  feasibilityScore,
  tripId,
  onDiscussWithNara,
  className,
}: FullJourneyMapHeaderProps) {
  const navigate = useNavigate();

  const backTo =
    tripId != null
      ? `/dashboard/plan-studio?tripId=${tripId}&tab=schedule`
      : '/dashboard/trips';

  return (
    <header className={cn(workbenchHeaderShell, 'shrink-0 px-4 py-2.5 sm:px-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className={cn('mt-0.5 h-9 w-9 shrink-0', journeyMapFocusRing)}
            asChild
          >
            <Link to={backTo} aria-label="返回规划工作台">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex min-w-0 items-center gap-2.5">
            <Logo size={28} variant="icon" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  全程地图
                </h1>
                <Badge
                  variant="secondary"
                  className={cn('h-5 px-1.5 text-[10px] font-medium', journeyMapAiBadge)}
                >
                  决策视图
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {subtitle ?? '路线 · 活动 · 参与者 · 分流 · 风险'}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium tracking-tight text-foreground">
                {tripTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction
            icon={HelpCircle}
            label="帮助"
            onClick={() => toast.info('帮助中心即将上线')}
          />
          <HeaderAction
            icon={Share2}
            label="分享"
            onClick={() => toast.success('分享链接已复制')}
          />
          <HeaderAction
            icon={Download}
            label="导出"
            onClick={() => toast.info('导出功能开发中')}
          />

          <div className="mx-1 hidden h-6 w-px bg-border/70 sm:block" aria-hidden />

          <WorkbenchFeasibilityRing
            score={feasibilityScore}
            onClick={() => {
              if (tripId) {
                navigate(`/dashboard/feasibility?tripId=${tripId}`);
              }
            }}
          />

          {onDiscussWithNara ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn('hidden h-9 gap-1.5 sm:flex', journeyMapFocusRing)}
              onClick={onDiscussWithNara}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              与 Nara 讨论
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'hidden h-9 gap-1.5 px-2.5 text-[11px] text-muted-foreground sm:flex',
        journeyMapFocusRing,
      )}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Button>
  );
}
