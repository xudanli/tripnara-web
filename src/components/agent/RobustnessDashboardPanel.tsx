import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield } from 'lucide-react';
import type {
  AlignmentSlice,
  RobustnessBottleneckRisk,
  RobustnessDashboardPayload,
  TripRobustnessDualCurvePoint,
} from '@/types/robustness-dashboard';
import {
  dualCurvesFromDashboard,
  formatRobustnessPercent,
  isOrgScoreLow,
} from '@/lib/robustness-dashboard';

export interface RobustnessDashboardPanelProps {
  rollout: RobustnessDashboardPayload;
  dualCurves?: TripRobustnessDualCurvePoint[];
  alignment?: AlignmentSlice;
  /** INTAKE 预演：虚线曲线 + 「预演」标签 */
  isPreview?: boolean;
  className?: string;
}

const BOTTLENECK_TONE: Record<string, string> = {
  PHYSICAL_BLOCK: 'bg-muted/150/15 text-muted-foreground border-border/35 dark:text-muted-foreground',
  EMOTIONAL_EXPLOSION: 'bg-orange-500/15 text-orange-950 border-orange-500/35 dark:text-orange-100',
  TIME_CRUNCH: 'bg-amber-500/15 text-amber-950 border-amber-500/35 dark:text-amber-100',
};

function bottleneckTone(risk: RobustnessBottleneckRisk): string {
  return BOTTLENECK_TONE[risk] ?? 'bg-muted text-foreground border-border';
}

function ScoreRing({
  label,
  score,
  highlight,
}: {
  label: string;
  score: number;
  highlight?: boolean;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border px-4 py-3 min-w-[88px]',
        highlight ? 'border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25' : 'border-border/70 bg-card/50'
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-bold tabular-nums', highlight && 'text-amber-800 dark:text-amber-200')}>
        {pct}%
      </span>
    </div>
  );
}

export function RobustnessDashboardPanel({
  rollout,
  dualCurves: dualCurvesProp,
  alignment,
  isPreview = false,
  className,
}: RobustnessDashboardPanelProps) {
  const dualCurves = useMemo(
    () => dualCurvesFromDashboard(rollout, dualCurvesProp),
    [rollout, dualCurvesProp]
  );

  const chartData = useMemo(
    () =>
      dualCurves.map((p, i) => ({
        idx: i + 1,
        label: p.timestamp?.slice(5, 10) || `#${i + 1}`,
        physical: Math.round(p.physical * 100),
        organizational: Math.round(p.organizational * 100),
      })),
    [dualCurves]
  );

  const orgLow = isOrgScoreLow(rollout.organizational_robustness_score);
  const bottlenecks = (rollout.bottlenecks ?? []).slice(0, 3);
  const contingencyPlans = rollout.contingency_plans ?? [];

  return (
    <div className={cn('space-y-3', className)}>
      <Card className={cn('shadow-none border-border/70', isPreview && 'border-dashed')}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                鲁棒性仪表盘
                {isPreview ? (
                  <Badge variant="outline" className="font-normal text-xs">
                    预演 · 基于当前草案
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                综合分 = min(物理, 组织) · {formatRobustnessPercent(rollout.combined_robustness_score)}
                {rollout.sample_count ? ` · 采样 ${rollout.sample_count}` : null}
              </CardDescription>
            </div>
            {orgLow ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                组织力偏低
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <ScoreRing label="物理" score={rollout.physical_robustness_score} />
            <ScoreRing
              label="组织"
              score={rollout.organizational_robustness_score}
              highlight={orgLow}
            />
            <ScoreRing label="综合" score={rollout.combined_robustness_score} />
          </div>

          {alignment &&
          (alignment.organizational_weight != null || alignment.physical_weight != null) ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">模型校准权重</div>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {alignment.physical_weight != null ? (
                  <div
                    className="bg-muted/150/80"
                    style={{ width: `${Math.round(alignment.physical_weight * 100)}%` }}
                    title={`物理 ${formatRobustnessPercent(alignment.physical_weight)}`}
                  />
                ) : null}
                {alignment.organizational_weight != null ? (
                  <div
                    className="bg-muted/150/80"
                    style={{ width: `${Math.round(alignment.organizational_weight * 100)}%` }}
                    title={`组织 ${formatRobustnessPercent(alignment.organizational_weight)}`}
                  />
                ) : null}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>物理 {formatRobustnessPercent(alignment.physical_weight)}</span>
                <span>组织 {formatRobustnessPercent(alignment.organizational_weight)}</span>
              </div>
            </div>
          ) : null}

          {chartData.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={36} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, '']}
                    labelFormatter={(l) => `节点 ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="physical"
                    name="物理鲁棒"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    strokeDasharray={isPreview ? '6 4' : undefined}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="organizational"
                    name="组织 (1−社交压力)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    strokeDasharray={isPreview ? '6 4' : undefined}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {bottlenecks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">瓶颈节点</div>
              {bottlenecks.map((b) => (
                <div
                  key={`${b.nodeId}-${b.primaryRisk}`}
                  className={cn('rounded-lg border px-3 py-2 text-sm', bottleneckTone(b.primaryRisk))}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {b.primaryRisk}
                    </Badge>
                    <span className="font-medium">{b.nodeId}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-90">{b.description || b.triggerEvent}</p>
                </div>
              ))}
            </div>
          ) : null}

          {!isPreview && contingencyPlans.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">备选预案</div>
              {contingencyPlans.map((plan, i) => (
                <div key={`${plan.trigger_node_id}-${i}`} className="rounded-lg border px-3 py-2 text-xs">
                  <span className="font-medium">{plan.trigger_node_id}</span>
                  <span className="text-muted-foreground"> · {plan.condition}</span>
                  {typeof plan.mutated_ir_step_delta === 'number' ? (
                    <span className="ml-1 text-muted-foreground">Δstep {plan.mutated_ir_step_delta}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default RobustnessDashboardPanel;
