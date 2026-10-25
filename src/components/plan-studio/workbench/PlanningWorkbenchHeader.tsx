import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Collaborator } from '@/types/trip';
import type { OverallReadinessCardDto } from '@/types/overall-readiness';
import { OverallReadinessCard } from '@/components/trips/detail/OverallReadinessCard';
import { WorkbenchCollaboratorsRow } from './WorkbenchCollaboratorsRow';
import { WorkbenchFeasibilityRing } from './WorkbenchFeasibilityRing';
import {
  workbenchHeaderShell,
  workbenchHeaderTitle,
  workbenchPlanRevisionBadge,
  workbenchHeaderModuleTabList,
  workbenchHeaderModuleTabTrigger,
} from './workbench-ui';

export interface PlanningWorkbenchHeaderProps {
  /** 主标题，如「冰岛西峡湾 · 5天行程」 */
  displayTitle: string;
  /** 方案/修订标签，如 A3 */
  planBadge?: string | null;
  /** 整体准备度壳层卡（主分数） */
  overallReadiness?: OverallReadinessCardDto | null;
  overallReadinessLoading?: boolean;
  lastSavedAt?: string | null;
  feasibilityScore: number | null;
  feasibilityLoading?: boolean;
  travelAssurance?: import('@/lib/travel-assurance-summary.util').TravelAssuranceSummary | null;
  onFeasibilityClick?: () => void;
  tripId?: string;
  collaborators?: Collaborator[] | null;
  collaboratorsLoading?: boolean;
  onOpenCollaborators?: () => void;
  onOpenCollaborationCenter?: () => void;
  collaborationPendingCount?: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAssistant?: () => void;
  /** 团队协作中心等全屏视图：隐藏规划/预算/行前 Tab 条 */
  hideTabBar?: boolean;
  className?: string;
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
  overallReadiness,
  overallReadinessLoading,
  lastSavedAt,
  feasibilityScore,
  feasibilityLoading,
  travelAssurance,
  onFeasibilityClick,
  tripId,
  collaborators,
  collaboratorsLoading,
  onOpenCollaborators,
  onOpenCollaborationCenter,
  collaborationPendingCount = 0,
  activeTab,
  onTabChange,
  onOpenAssistant,
  hideTabBar = false,
  className,
}: PlanningWorkbenchHeaderProps) {
  const lastSavedLabel = formatLastSaved(lastSavedAt);

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
              {tripId ? (
                <OverallReadinessCard
                  tripId={tripId}
                  readiness={overallReadiness}
                  loading={overallReadinessLoading}
                  compact
                />
              ) : (
                <span className="text-[11px] text-muted-foreground">整体准备度 —</span>
              )}
              {lastSavedLabel ? (
                <span className="text-[11px] text-muted-foreground">
                  上次保存：{lastSavedLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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

          {!hideTabBar ? (
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className={workbenchHeaderModuleTabList}>
                <TabsTrigger value="schedule" className={workbenchHeaderModuleTabTrigger}>
                  规划
                </TabsTrigger>
                <TabsTrigger value="budget" className={workbenchHeaderModuleTabTrigger}>
                  预算
                </TabsTrigger>
                <TabsTrigger value="tasks" className={workbenchHeaderModuleTabTrigger}>
                  行前
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {onOpenAssistant ? (
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onOpenAssistant}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          ) : null}

          <WorkbenchFeasibilityRing
            score={feasibilityScore}
            loading={feasibilityLoading}
            assurance={travelAssurance}
            onClick={onFeasibilityClick}
          />
        </div>
      </div>
    </header>
  );
}
