import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ctreEmptyStateCopy,
  ctreEmptyStateShortCopy,
  shouldShowTripCtrePanel,
} from '../constants';
import { useCtreCompileProgress } from '../hooks/useCtreCompileProgress';
import { CtreCompileProgressPanel } from './CtreCompileProgressPanel';

export type TripCtreStructuredProgressSectionProps = {
  tripId: string;
  compact?: boolean;
  className?: string;
  /** 覆盖默认跳转 Plan Studio */
  onOpenPlanStudio?: () => void;
};

function TripCtreEmptyState({
  compact,
  onOpenPlanStudio,
}: {
  compact?: boolean;
  onOpenPlanStudio: () => void;
}) {
  return (
    <div className={cn('space-y-2 rounded-md border border-dashed border-border/60 bg-muted/15 p-2.5', compact && 'p-2')}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={cn('text-muted-foreground leading-relaxed cursor-help', compact ? 'text-[10px]' : 'text-xs')}>
              {ctreEmptyStateShortCopy()}
            </p>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm text-xs leading-relaxed">
            {ctreEmptyStateCopy()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={onOpenPlanStudio}>
        进入规划工作台 · 生成方案
      </Button>
    </div>
  );
}

/**
 * Trip 详情「结构化进度」— 离线 compile-progress + §11.14 空态。
 * Compiler 前端开关关闭时不渲染。
 */
export function TripCtreStructuredProgressSection({
  tripId,
  compact = true,
  className,
  onOpenPlanStudio,
}: TripCtreStructuredProgressSectionProps) {
  const navigate = useNavigate();
  const { progress, loading, graphNotFound, reload } = useCtreCompileProgress(tripId);

  if (!shouldShowTripCtrePanel(tripId)) return null;

  const openPlanStudio =
    onOpenPlanStudio ??
    (() => {
      navigate(`/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}`);
    });

  const showEmpty = !loading && !progress && graphNotFound;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[10px] text-muted-foreground"
          disabled={loading}
          onClick={() => void reload()}
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          刷新
        </Button>
      </div>
      {progress ? (
        <CtreCompileProgressPanel progress={progress} compact={compact} defaultPhasesExpanded={false} />
      ) : null}
      {loading && !progress ? (
        <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
          加载编译进度…
        </p>
      ) : null}
      {showEmpty ? <TripCtreEmptyState compact={compact} onOpenPlanStudio={openPlanStudio} /> : null}
    </div>
  );
}
