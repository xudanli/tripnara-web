import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tripsApi } from '@/api/trips';
import { AssistantContextGroundingStrip } from '@/features/trip-context/components/AssistantContextGroundingStrip';
import { WorkbenchFeasibilityRing } from '@/components/plan-studio/workbench/WorkbenchFeasibilityRing';
import { DecisionStripDecisionLogPreview } from '@/components/plan-studio/DecisionStripDecisionLogPreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useWorkbenchBudgetProfile,
  useWorkbenchPlanningConflicts,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { useWorkbenchFeasibilityScore } from '@/hooks/useWorkbenchFeasibilityScore';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  BedDouble,
  Car,
  CloudSun,
  FileText,
  MapPin,
  Users,
} from 'lucide-react';
import type { ScheduleTimelineDay } from '@/types/schedule-timeline';

interface NaraContextPanelProps {
  tripId: string | null | undefined;
  className?: string;
}

function formatDriveDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDriveDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  return `${Math.round(meters / 1000)} km`;
}

function resolveDayDriveSummary(day: ScheduleTimelineDay): { distanceLabel: string; durationLabel: string } {
  const travel = day.travelInfo?.summary;
  return {
    distanceLabel: formatDriveDistance(travel?.totalDistance ?? 0),
    durationLabel: formatDriveDuration(travel?.totalDuration ?? 0),
  };
}

function MetricPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'reject' | 'confirm';
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold',
          tone === 'reject' && 'text-gate-reject-foreground',
          tone === 'confirm' && 'text-gate-confirm-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function NaraContextPanel({ tripId, className }: NaraContextPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('context');

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['nara-context-trip', tripId],
    queryFn: () => tripsApi.getById(tripId!),
    enabled: Boolean(tripId),
  });

  const { data: conflictsBundle, isLoading: conflictsLoading } = useWorkbenchPlanningConflicts(tripId, {
    includeDecisionChecker: false,
  });

  const { data: budgetProfile } = useWorkbenchBudgetProfile(tripId);
  const feasibility = useWorkbenchFeasibilityScore(conflictsBundle, conflictsLoading);

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['nara-context-timeline', tripId],
    queryFn: async () => {
      const result = await tripsApi.getScheduleTimeline(tripId!, {
        include: ['metrics', 'travelInfo'],
        limit: 5,
      });
      return result.status === 'ok' ? result.data : null;
    },
    enabled: Boolean(tripId),
  });

  const summary = conflictsBundle?.summary;
  const hardConflicts = summary?.mustHandle ?? 0;
  const needConfirm = summary?.pendingConfirm ?? 0;

  const budgetPerPerson = useMemo(() => {
    const total = budgetProfile?.intent?.total;
    const travelers = Math.max(1, trip?.travelers?.length ?? 1);
    if (typeof total !== 'number') return null;
    return Math.round(total / travelers);
  }, [budgetProfile, trip]);

  const highlightDayIndex = useMemo(() => {
    if (!timeline?.days?.length || !conflictsBundle?.conflicts?.length) return null;
    const drivingConflict = conflictsBundle.conflicts.find(
      (item) =>
        item.category === 'transport' ||
        item.title?.includes('驾驶') ||
        item.title?.includes('交通'),
    );
    return drivingConflict?.affectedDays?.[0] ?? null;
  }, [timeline?.days, conflictsBundle?.conflicts]);

  useEffect(() => {
    setActiveTab('context');
  }, [tripId]);

  if (!tripId) {
    return (
      <aside className={cn('flex h-full w-full flex-col border-l border-border bg-background', className)}>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium">暂无关联行程</p>
          <p className="mt-1 text-xs text-muted-foreground">创建或选择一个行程后，上下文面板将显示可行性、冲突与日程摘要。</p>
          <Button className="mt-4" size="sm" onClick={() => navigate('/dashboard/trips/new')}>
            创建新行程
          </Button>
        </div>
      </aside>
    );
  }

  const loading = tripLoading || conflictsLoading;

  return (
    <aside
      className={cn('flex h-full w-full min-w-0 flex-col border-l border-border bg-background', className)}
      aria-label="行程上下文面板"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border px-3 pt-3">
          <TabsList className="grid h-9 w-full grid-cols-3">
            <TabsTrigger value="context" className="text-xs">
              行程上下文
            </TabsTrigger>
            <TabsTrigger value="decisions" className="text-xs">
              决策历史
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs">
              参考资料
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="context" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              <AssistantContextGroundingStrip activeTripId={tripId} />
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : trip ? (
                <>
                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {(trip as typeof trip & { name?: string }).name || trip.destination || '当前行程'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {trip.destination?.split(',')[0]?.trim() || '—'}
                        </span>
                        <span>
                          {format(new Date(trip.startDate), 'yyyy-MM-dd')} –{' '}
                          {format(new Date(trip.endDate), 'yyyy-MM-dd')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {(trip?.travelers?.length ?? 1)} 人
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <WorkbenchFeasibilityRing
                          score={feasibility.score}
                          loading={feasibility.loading}
                          assurance={feasibility.assurance}
                          className="shrink-0"
                        />
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <MetricPill
                            label="可行性"
                            value={feasibility.score != null ? `${feasibility.score}%` : '—'}
                          />
                          <MetricPill
                            label="硬冲突"
                            value={String(hardConflicts)}
                            tone={hardConflicts > 0 ? 'reject' : 'neutral'}
                          />
                          <MetricPill
                            label="待确认"
                            value={String(needConfirm)}
                            tone={needConfirm > 0 ? 'confirm' : 'neutral'}
                          />
                          <MetricPill
                            label="人均预算"
                            value={budgetPerPerson != null ? `¥${budgetPerPerson.toLocaleString()}` : '—'}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">当前行程（节选）</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {timelineLoading ? (
                        <div className="flex justify-center py-4">
                          <Spinner className="h-5 w-5" />
                        </div>
                      ) : timeline?.days?.length ? (
                        timeline.days.slice(0, 3).map((day) => {
                          const drive = resolveDayDriveSummary(day);
                          const isHighlighted = highlightDayIndex === day.dayIndex;
                          const itemCount = day.itineraryItems?.length ?? day.schedule?.items?.length ?? 0;
                          return (
                            <div
                              key={day.dayId}
                              className={cn(
                                'rounded-lg border px-3 py-2',
                                isHighlighted
                                  ? 'border-gate-reject-border bg-gate-reject/10'
                                  : 'border-border/70 bg-muted/10',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium">Day {day.dayIndex}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(day.date), 'MM-dd')} · {itemCount} 个活动
                                  </p>
                                </div>
                                {isHighlighted ? (
                                  <Badge variant="outline" className="border-gate-reject-border text-gate-reject-foreground">
                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                    冲突
                                  </Badge>
                                ) : null}
                              </div>
                              <p
                                className={cn(
                                  'mt-1 text-xs',
                                  isHighlighted ? 'font-medium text-gate-reject-foreground' : 'text-muted-foreground',
                                )}
                              >
                                {drive.distanceLabel} · {drive.durationLabel}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">暂无日程数据</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full"
                        onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=schedule`)}
                      >
                        查看完整行程
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">关键信息</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        <span>住宿</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>交通</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2">
                        <CloudSun className="h-4 w-4 text-muted-foreground" />
                        <span>天气</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>资料</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="decisions" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 p-4">
            <DecisionStripDecisionLogPreview tripId={tripId} enabled={activeTab === 'decisions'} />
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => navigate(`/dashboard/trips/${tripId}?tab=decision-log`)}
            >
              查看完整决策历史
            </Button>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="materials" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 p-4">
            <Card className="border-border/70 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">相关文件与资料</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  行程附件与攻略资料将在后续版本接入。你可在行程详情页上传 PDF、预订确认等材料。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/dashboard/trips/${tripId}`)}
                >
                  前往行程详情
                </Button>
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
