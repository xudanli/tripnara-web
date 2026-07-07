import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import { executionVerdictLabel } from '@/lib/trip-execution-advisory.adapter';
import { useExecuteCausalInsight } from '@/hooks/useExecuteCausalInsight';
import { ExecuteCausalInsightPanel } from '@/components/execute/live/ExecuteCausalInsightPanel';

interface ExecutionAdvisorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId?: string | null;
  advisory: TripExecutionAdvisoryDto | null;
  onApplyRecommendation?: (id: string) => void;
  onKeepPlan?: () => void;
}

export function ExecutionAdvisorySheet({
  open,
  onOpenChange,
  tripId,
  advisory,
  onApplyRecommendation,
  onKeepPlan,
}: ExecutionAdvisorySheetProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const { insight: causalInsight, loading: causalInsightLoading } = useExecuteCausalInsight(
    tripId,
    advisory,
    { overviewTabActive: open, allowDemoFallback: false },
  );

  if (!advisory) return null;

  const keepPlan = advisory.recommendations.find((r) => r.actionType === 'keep');
  const actionable = advisory.recommendations.filter((r) => r.actionType !== 'keep');
  const showCausalChain = Boolean(causalInsight?.causalStory.chain?.length || causalInsightLoading);
  const showDeviationFallback = !showCausalChain && advisory.deviations.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>今日执行建议</SheetTitle>
          <SheetDescription>
            第 {advisory.dayNumber} 天 · {executionVerdictLabel(advisory.verdict.status)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {(causalInsight || causalInsightLoading) && (
            <ExecuteCausalInsightPanel insight={causalInsight} loading={causalInsightLoading} />
          )}

          {!causalInsight && !causalInsightLoading && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="font-medium">{advisory.verdict.headline}</p>
              {advisory.currentState.delayMinutes > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  当前延误约 {advisory.currentState.delayMinutes} 分钟
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">当前状态</h3>
            <ul className="space-y-2 text-sm">
              {advisory.impacts.affectedItems.map((item) => (
                <li key={item.itemId} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[9px] shrink-0 capitalize">
                    {item.status}
                  </Badge>
                  <div>
                    <span>{item.title}</span>
                    {item.projectedArrival && (
                      <p className="text-xs text-muted-foreground">
                        预计 {format(new Date(item.projectedArrival), 'HH:mm')} 到达
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-amber-700">{item.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {showDeviationFallback && (
            <div>
              <h3 className="text-sm font-medium mb-2">发生了什么</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {advisory.deviations.map((d) => (
                  <li key={d.id}>{d.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-3">建议调整</h3>
            <div className="space-y-3">
              {actionable.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    'rounded-lg border p-3',
                    rec.isRecommended && 'border-border bg-muted/15',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{rec.label}</span>
                    {rec.isRecommended && (
                      <Badge variant="secondary" className="text-[10px]">推荐</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                  {rec.impactSummary && (
                    <p className="text-xs text-muted-foreground mt-1">{rec.impactSummary}</p>
                  )}
                  {rec.estimatedHotelArrival && (
                    <p className="text-xs mt-1">
                      预计抵达酒店 {format(new Date(rec.estimatedHotelArrival), 'HH:mm')}
                    </p>
                  )}
                  {rec.drivingAfterDarkRisk != null && (
                    <p className="text-xs text-amber-700 mt-1">
                      天黑后驾驶风险 {Math.round(rec.drivingAfterDarkRisk * 100)}%
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => onApplyRecommendation?.(rec.id)}
                  >
                    应用方案
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {keepPlan && advisory.verdict.status !== 'ON_TRACK' && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <p className="font-medium text-xs text-muted-foreground">后果对比</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-50 p-2">
                  <p className="font-medium">继续按当前计划</p>
                  <p className="text-muted-foreground mt-1">
                    {advisory.impacts.drivingAfterDarkRisk != null
                      ? `${Math.round(advisory.impacts.drivingAfterDarkRisk * 100)}% 概率在天黑后驾驶`
                      : '可能无法完成全部站点'}
                  </p>
                </div>
                <div className="rounded bg-muted/15 p-2">
                  <p className="font-medium">采用调整</p>
                  <p className="text-muted-foreground mt-1">
                    {actionable[0]?.impactSummary ?? '降低赶路风险，优先安全与可恢复性'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={onKeepPlan}>
                {keepPlan.label}
              </Button>
            </div>
          )}

          <div className="rounded-lg border p-3 text-xs space-y-1">
            <p className="font-medium text-sm">实时风险</p>
            <p>道路：{advisory.realtimeRisks.road ?? '—'}</p>
            <p>天气：{advisory.realtimeRisks.weather ?? '—'}</p>
            <p>营业：{advisory.realtimeRisks.openingHours ?? '—'}</p>
            {advisory.realtimeRisks.nextCheckAt && (
              <p className="text-muted-foreground">
                下一次自动检查：{advisory.realtimeRisks.nextCheckAt}
              </p>
            )}
          </div>

          {advisory.technicalFindings && advisory.technicalFindings.length > 0 && (
            <Collapsible open={technicalOpen} onOpenChange={setTechnicalOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs w-full justify-between">
                  查看技术依据（Readiness / 证据）
                  <ChevronDown className={cn('h-3 w-3', technicalOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded border bg-slate-50 p-3 text-xs space-y-2">
                {advisory.technicalFindings.map((f) => (
                  <div key={f.id}>
                    <Badge variant="outline" className="text-[9px] mr-1">{f.type}</Badge>
                    {f.message}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
