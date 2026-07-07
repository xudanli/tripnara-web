import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttractionExploreCandidate, AttractionExploreContextResponse } from '@/types/attraction-explore';
import type { ArrangeItineraryOverviewResponse } from '@/types/arrange-itinerary';
import { ArrangeItineraryItemLocksPanel } from './ArrangeItineraryItemLocksPanel';
import { ArrangeItineraryCopilotSuggestionsPanel } from './ArrangeItineraryCopilotSuggestionsPanel';
import { PlanningDecisionClusterQueueStrip } from './PlanningDecisionClusterQueueStrip';
import type { PlanningDecisionClusterSummary } from '@/dto/frontend-planning-decision-pack.types';
import type { WorkbenchRouteStats } from '../useWorkbenchItineraryData';
import {
  formatWorkbenchDistanceKm,
  formatWorkbenchDurationMinutes,
} from '../workbench-format.util';
import {
  workbenchAttractionExploreCandidateItem,
  workbenchAttractionExploreContextCard,
  workbenchAttractionExploreSectionTitle,
  workbenchLinkClass,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';

export interface ArrangeItineraryContextPanelProps {
  context?: AttractionExploreContextResponse | null;
  overview?: ArrangeItineraryOverviewResponse | null;
  candidates: AttractionExploreCandidate[];
  candidatesLoading?: boolean;
  routeStats: WorkbenchRouteStats | null;
  activityCount: number;
  dayCount: number;
  nights: number;
  onRemoveCandidate?: (candidateId: string) => void;
  onPlaceCandidate?: (candidateId: string) => void;
  placePending?: boolean;
  removePending?: boolean;
  onEditPreferences?: () => void;
  itemLocks?: import('@/types/arrange-itinerary').ArrangeItemLocksResponse | null;
  itemLocksLoading?: boolean;
  userLockedItemIds?: Set<string>;
  copilotSuggestions?: import('@/types/arrange-itinerary').CopilotSuggestion[];
  copilotSuggestionsLoading?: boolean;
  copilotActionPending?: boolean;
  onExecuteCopilotSuggestion?: (suggestion: import('@/types/arrange-itinerary').CopilotSuggestion) => void;
  pendingProposalCount?: number;
  decisionClusters?: PlanningDecisionClusterSummary[];
  activeProposalId?: string | null;
  onOpenActiveProposal?: () => void;
  decisionClustersLoading?: boolean;
  className?: string;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function ArrangeItineraryContextPanel({
  context,
  overview,
  candidates,
  candidatesLoading = false,
  routeStats,
  activityCount,
  dayCount,
  nights,
  onRemoveCandidate,
  onPlaceCandidate,
  placePending = false,
  removePending = false,
  itemLocks,
  itemLocksLoading = false,
  userLockedItemIds,
  copilotSuggestions = [],
  copilotSuggestionsLoading = false,
  copilotActionPending = false,
  onExecuteCopilotSuggestion,
  pendingProposalCount = 0,
  decisionClusters = [],
  activeProposalId,
  onOpenActiveProposal,
  decisionClustersLoading = false,
  className,
}: ArrangeItineraryContextPanelProps) {
  const selectedThemes = context?.themes.filter((theme) =>
    context.selectedThemeIds.includes(theme.id),
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <h2 className={workbenchPanelTitle}>行程配置</h2>
      </div>

      <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-3', workbenchScrollable)}>
        <PlanningDecisionClusterQueueStrip
          clusters={decisionClusters}
          activeProposalId={activeProposalId}
          loading={decisionClustersLoading}
          onOpenActiveProposal={onOpenActiveProposal}
        />
        <ArrangeItineraryCopilotSuggestionsPanel
          suggestions={copilotSuggestions}
          loading={copilotSuggestionsLoading}
          actionPending={copilotActionPending}
          onExecuteSuggestion={onExecuteCopilotSuggestion}
        />
        {pendingProposalCount > 0 ? (
          <p className="text-[10px] text-muted-foreground">
            待确认草案 {pendingProposalCount} 项
          </p>
        ) : null}

        <section>
          <p className={workbenchAttractionExploreSectionTitle}>旅行目标</p>
          {selectedThemes && selectedThemes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedThemes.map((theme) => (
                <span
                  key={theme.id}
                  className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] text-foreground"
                >
                  {theme.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">尚未选择主题</p>
          )}
        </section>

        <section className={workbenchAttractionExploreContextCard}>
          <p className={workbenchAttractionExploreSectionTitle}>路线模式</p>
          <dl className="mt-2 space-y-1.5 text-[11px]">
            <Row label="出发" value={overview?.departureLabel ?? context?.tripContext?.departureLabel} />
            <Row label="交通" value={overview?.transportLabel ?? context?.tripContext?.transportLabel} />
            <Row label="节奏" value={overview?.pacingLabel ?? context?.tripContext?.paceLabel} />
          </dl>
        </section>

        <section className={workbenchAttractionExploreContextCard}>
          <p className={workbenchAttractionExploreSectionTitle}>路线概览</p>
          <div className="mt-2 space-y-1.5">
            <StatRow label="天数" value={`${dayCount} 天 / ${nights} 晚`} />
            <StatRow
              label="总驾驶"
              value={formatWorkbenchDurationMinutes(
                overview?.totalDriveMinutes ?? routeStats?.totalDriveMinutes,
              )}
            />
            <StatRow
              label="总里程"
              value={formatWorkbenchDistanceKm(
                overview?.totalDistanceKm ?? routeStats?.totalDistanceKm,
              )}
            />
            <StatRow label="活动数" value={`${activityCount} 项`} />
            {overview?.routeSpanKm != null ? (
              <StatRow label="路线跨度" value={`${overview.routeSpanKm} km`} />
            ) : null}
            {overview?.unplacedCandidateCount != null ? (
              <StatRow label="待编排" value={`${overview.unplacedCandidateCount} 个`} />
            ) : null}
          </div>
        </section>

        <section className={workbenchAttractionExploreContextCard}>
          <p className={workbenchAttractionExploreSectionTitle}>住宿节奏</p>
          <p className="mt-1 text-[11px] text-foreground">
            {context?.tripContext?.paceLabel ?? '待设置'}
          </p>
        </section>

        {context?.memberPreferences ? (
          <section className={workbenchAttractionExploreContextCard}>
            <p className={workbenchAttractionExploreSectionTitle}>成员偏好</p>
            <div className="mt-2 flex -space-x-1">
              {context.memberPreferences.memberInitials.map((initial, index) => (
                <span
                  key={`${initial}-${index}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground"
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {context.memberPreferences.summary}
            </p>
          </section>
        ) : null}

        <ArrangeItineraryItemLocksPanel
          itemLocks={itemLocks}
          userLockedItemIds={userLockedItemIds}
          loading={itemLocksLoading}
        />

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={workbenchAttractionExploreSectionTitle}>待编排景点</p>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {candidates.length} 个
            </span>
          </div>
          {candidatesLoading ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">加载中…</p>
          ) : candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
              暂无待编排候选，可先在探索景点中添加
            </p>
          ) : (
            <ul className="space-y-1">
              {candidates.map((candidate) => (
                <li key={candidate.id} className={workbenchAttractionExploreCandidateItem}>
                  <GripVertical
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                  {candidate.imageUrl ? (
                    <img
                      src={candidate.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/30 text-[10px] text-muted-foreground">
                      POI
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">
                      {candidate.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {candidate.priority === 'must_go' ? '必去' : '候选'}
                    </p>
                  </div>
                  {onPlaceCandidate ? (
                    <button
                      type="button"
                      className={cn(workbenchLinkClass, 'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50')}
                      disabled={placePending}
                      onClick={() => onPlaceCandidate(candidate.id)}
                    >
                      排入
                    </button>
                  ) : null}
                  {onRemoveCandidate ? (
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      aria-label={`移出 ${candidate.name}`}
                      disabled={removePending}
                      onClick={() => onRemoveCandidate(candidate.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-10 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground">{value?.trim() || '—'}</dd>
    </div>
  );
}
