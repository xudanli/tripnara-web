import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DayItineraryCard from '@/components/trips/DayItineraryCard';
import { AssistantCenter } from '@/components/trips/AssistantCenter';
import BudgetOverviewCard from '@/components/trips/BudgetOverviewCard';
import type { Health } from '@/api/trip-detail';
import type { DayMetricsResponse, TripDetail } from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import {
  TripDetailSection,
  TripDetailStatCard,
  TripDetailTwoColumn,
  tripDetailUi,
} from '../trip-detail-ui';

interface TripDetailOverviewTabProps {
  trip: TripDetail;
  tripId: string;
  suggestions: Suggestion[];
  dayMetricsMap: Map<string, DayMetricsResponse>;
  tripHealth?: Health | null;
  healthMetrics: { executable: number; buffer: number; risk: number; cost: number };
  onViewBudget: () => void;
  onViewPlanStudio: (dayId?: string) => void;
  onAddItem: (dayId: string) => void;
  onViewSuggestions: () => void;
  assistantCenterProps: ComponentProps<typeof AssistantCenter>;
}

export default function TripDetailOverviewTab({
  trip,
  tripId,
  suggestions,
  dayMetricsMap,
  tripHealth,
  healthMetrics,
  onViewBudget,
  onViewPlanStudio,
  onAddItem,
  onViewSuggestions,
  assistantCenterProps,
}: TripDetailOverviewTabProps) {
  const overallScore = tripHealth?.overallScore ?? Math.round(
    (healthMetrics.executable + healthMetrics.buffer + (100 - healthMetrics.risk) + healthMetrics.cost) / 4,
  );
  const pendingCount = suggestions.filter((s) => s.severity === 'blocker' || s.severity === 'warn').length;
  const planningProgress = Math.min(100, Math.round(
    ((trip.TripDay?.reduce((acc, d) => acc + (d.ItineraryItem?.length ?? 0), 0) ?? 0) /
      Math.max(1, (trip.TripDay?.length ?? 1) * 3)) *
      100,
  ));

  const feasibilityTag =
    overallScore >= 70 ? tripDetailUi.tagVerified : overallScore >= 50 ? tripDetailUi.tagAllow : tripDetailUi.tagConfirm;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <TripDetailStatCard
          label="规划进度"
          value={`${planningProgress}%`}
          sub={<Progress value={planningProgress} className="h-1.5 mt-2" />}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <TripDetailStatCard
          label="可行性"
          value={overallScore}
          sub={
            <Badge variant="outline" className={feasibilityTag}>
              {overallScore >= 70 ? '良好' : overallScore >= 50 ? '可控' : '需关注'}
            </Badge>
          }
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <TripDetailStatCard
          label="待确认"
          value={pendingCount}
          sub="项需确认"
          icon={<Clock className="w-5 h-5" />}
        />
        {pendingCount > 0 ? (
          <div
            className={cn(
              tripDetailUi.statCard,
              'flex items-center gap-3 border-gate-confirm-border bg-gate-confirm/10',
            )}
          >
            <AlertTriangle className="w-5 h-5 text-gate-confirm-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gate-confirm-foreground">有待处理事项</p>
              <Button variant="link" className={tripDetailUi.linkInline} onClick={onViewSuggestions}>
                查看详情
              </Button>
            </div>
          </div>
        ) : (
          <TripDetailStatCard label="风险缓冲" value="充足" sub="当前行程可控" />
        )}
      </div>

      <TripDetailTwoColumn
        main={
          <TripDetailSection title="路线概览">
            <div className="space-y-3">
              {(trip.TripDay || []).map((day, idx) => (
                <DayItineraryCard
                  key={day.id}
                  day={day}
                  dayIndex={idx}
                  dayMetrics={dayMetricsMap.get(day.date)}
                  suggestions={suggestions}
                  tripId={tripId}
                  onViewBudget={onViewBudget}
                  onViewItinerary={
                    trip.status === 'PLANNING' ? () => onViewPlanStudio(day.id) : undefined
                  }
                  onViewSuggestions={onViewSuggestions}
                  onAddItem={trip.status !== 'CANCELLED' ? () => onAddItem(day.id) : undefined}
                  onQuickPlan={
                    trip.status === 'PLANNING' ? () => onViewPlanStudio(day.id) : undefined
                  }
                />
              ))}
            </div>
          </TripDetailSection>
        }
        sidebar={
          <>
            <BudgetOverviewCard
              tripId={tripId}
              onViewDetails={onViewBudget}
              onSetConstraint={onViewBudget}
            />
            <div data-assistant-center>
              <AssistantCenter {...assistantCenterProps} />
            </div>
          </>
        }
      />
    </div>
  );
}
