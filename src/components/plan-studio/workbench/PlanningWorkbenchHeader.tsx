import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowLeft, ChevronDown, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeatherCard } from '@/components/weather/WeatherCard';
import type { Collaborator, PipelineStatus } from '@/types/trip';
import { getPipelineProgressColor } from '@/lib/pipeline-status';
import { WorkbenchCollaboratorsRow } from './WorkbenchCollaboratorsRow';
import { WorkbenchFeasibilityRing } from './WorkbenchFeasibilityRing';
import {
  workbenchHeaderShell,
  workbenchHeaderTitle,
  workbenchPlanRevisionBadge,
  workbenchProgressTrack,
  workbenchTabList,
  workbenchTabTrigger,
} from './workbench-ui';

export interface PlanningWorkbenchHeaderProps {
  /** 主标题，如「冰岛西峡湾 · 5天行程」 */
  displayTitle: string;
  /** 方案/修订标签，如 A3 */
  planBadge?: string | null;
  pipelineStatus: PipelineStatus | null;
  lastSavedAt?: string | null;
  feasibilityScore: number | null;
  feasibilityLoading?: boolean;
  onFeasibilityClick?: () => void;
  onPipelineClick?: () => void;
  isPipelineLoading?: boolean;
  tripId?: string;
  collaborators?: Collaborator[] | null;
  collaboratorsLoading?: boolean;
  onOpenCollaborators?: () => void;
  onOpenCollaborationCenter?: () => void;
  collaborationPendingCount?: number;
  weather?: {
    location: { lat: number; lng: number };
    name: string;
    includeWindDetails?: boolean;
  } | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAssistant?: () => void;
  /** 团队协作中心等全屏视图：隐藏行程/预算/行前 Tab 条 */
  hideTabBar?: boolean;
  className?: string;
}

function resolvePlanningProgress(status: PipelineStatus | null): number {
  if (!status?.stages?.length) return 0;
  const completed = status.stages.filter((s) => s.status === 'completed').length;
  return Math.round((completed / status.stages.length) * 100);
}

function formatLastSaved(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: false, locale: zhCN });
  } catch {
    return null;
  }
}

/** 规划工作台顶栏 */
export function PlanningWorkbenchHeader({
  displayTitle,
  planBadge,
  pipelineStatus,
  lastSavedAt,
  feasibilityScore,
  feasibilityLoading,
  onFeasibilityClick,
  onPipelineClick,
  isPipelineLoading,
  tripId,
  collaborators,
  collaboratorsLoading,
  onOpenCollaborators,
  onOpenCollaborationCenter,
  collaborationPendingCount = 0,
  weather,
  activeTab,
  onTabChange,
  onOpenAssistant,
  hideTabBar = false,
  className,
}: PlanningWorkbenchHeaderProps) {
  const progressPct = resolvePlanningProgress(pipelineStatus);
  const lastSavedLabel = formatLastSaved(lastSavedAt);
  const progressColor =
    pipelineStatus?.stages.some((s) => s.status === 'risk')
      ? getPipelineProgressColor('risk')
      : pipelineStatus?.stages.some((s) => s.status === 'in-progress')
        ? getPipelineProgressColor('in-progress')
        : getPipelineProgressColor('completed');

  return (
    <header className={cn(workbenchHeaderShell, 'px-4 py-3 sm:px-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 h-8 w-8 shrink-0" asChild>
            <Link to="/dashboard" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className={cn(workbenchHeaderTitle, 'text-foreground')}>{displayTitle}</h1>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
              {planBadge ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-5 shrink-0 rounded-md px-1.5 text-[10px] font-semibold',
                    workbenchPlanRevisionBadge,
                  )}
                >
                  {planBadge}
                </Badge>
              ) : null}
            </div>

            <div className="mt-2 flex max-w-lg flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">规划进度</span>
              <button
                type="button"
                className="flex min-w-[140px] flex-1 items-center gap-2 text-left disabled:opacity-60 sm:max-w-xs"
                onClick={onPipelineClick}
                disabled={!onPipelineClick || isPipelineLoading}
                title={onPipelineClick ? '点击查看各阶段详情' : undefined}
              >
                <div className={cn(workbenchProgressTrack, 'min-w-[100px] flex-1')}>
                  <div
                    className={cn('h-full transition-all duration-300', progressColor)}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {isPipelineLoading ? '…' : `${progressPct}%`}
                </span>
              </button>
              {lastSavedLabel ? (
                <span className="text-[11px] text-muted-foreground">
                  上次保存：{lastSavedLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {weather ? (
            <div className="hidden sm:block">
              <WeatherCard
                location={weather.location}
                locationName={weather.name}
                compact
                includeWindDetails={weather.includeWindDetails}
                refreshInterval={10 * 60 * 1000}
              />
            </div>
          ) : null}

          {tripId ? (
            <WorkbenchCollaboratorsRow
              tripId={tripId}
              collaborators={collaborators}
              loading={collaboratorsLoading}
              onOpenMembers={onOpenCollaborators}
              onOpenCollaborationCenter={onOpenCollaborationCenter}
              collaborationPendingCount={collaborationPendingCount}
            />
          ) : null}

          {onOpenAssistant ? (
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onOpenAssistant}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          ) : null}

          <WorkbenchFeasibilityRing
            score={feasibilityScore}
            loading={feasibilityLoading}
            onClick={onFeasibilityClick}
          />
        </div>
      </div>

      {!hideTabBar ? (
        <div className="mt-3 border-t border-border/40 pt-2">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className={workbenchTabList}>
              <TabsTrigger value="schedule" className={workbenchTabTrigger}>
                行程
              </TabsTrigger>
              <TabsTrigger value="budget" className={workbenchTabTrigger}>
                预算
              </TabsTrigger>
              <TabsTrigger value="tasks" className={workbenchTabTrigger}>
                行前
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : null}
    </header>
  );
}
