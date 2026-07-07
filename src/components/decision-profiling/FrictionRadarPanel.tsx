import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Radar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  COMPATIBILITY_BAND_CLASSES,
  FRICTION_DOMAIN_LABELS,
  FRICTION_LEVEL_TEXT,
} from '@/lib/decision-profiling-labels';
import { cn } from '@/lib/utils';
import { useFrictionRadar } from '@/hooks/useDecisionProfiling';
import { frictionLevelBarClass } from './decision-profiling-ui';

interface FrictionRadarPanelProps {
  tripId: string;
  enabled?: boolean;
}

function FrictionPairRow({
  memberAName,
  memberBName,
  overallLevel,
  cells,
}: {
  memberAName: string;
  memberBName: string;
  overallLevel: 'green' | 'yellow' | 'red';
  cells: { domain: keyof typeof FRICTION_DOMAIN_LABELS; level: 'green' | 'yellow' | 'red'; reason: string }[];
}) {
  const [open, setOpen] = useState(overallLevel === 'red');

  return (
    <div className="rounded-md border overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('h-2 w-2 rounded-full shrink-0', frictionLevelBarClass(overallLevel))} />
          <span className="text-sm font-medium truncate">
            {memberAName} × {memberBName}
          </span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {FRICTION_LEVEL_TEXT[overallLevel]}
          </Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open ? (
        <div className="border-t px-3 py-2 space-y-2 bg-muted/10">
          {cells.map((cell) => (
            <div key={cell.domain} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{FRICTION_DOMAIN_LABELS[cell.domain]}</span>
                <span className={cn('font-medium', cell.level === 'red' ? 'text-gate-reject-foreground' : '')}>
                  {FRICTION_LEVEL_TEXT[cell.level]}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', frictionLevelBarClass(cell.level))}
                  style={{ width: `${Math.round(cell.level === 'green' ? 30 : cell.level === 'yellow' ? 60 : 90)}%` }}
                />
              </div>
              {cell.reason ? <p className="text-[11px] text-muted-foreground">{cell.reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FrictionRadarPanel({ tripId, enabled = true }: FrictionRadarPanelProps) {
  const { data, loading, reload } = useFrictionRadar(tripId, enabled);

  if (!enabled) return null;

  if (loading && !data) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        至少 2 名成员完成调查后，摩擦矩阵才有意义
      </p>
    );
  }

  const compat = data.compatibility;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          完成率 {data.completionRate}%（{data.completedCount}/{data.memberCount} 人）
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void reload()}>
          刷新
        </Button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">消费兼容性</p>
            <p className={cn('text-lg font-semibold', COMPATIBILITY_BAND_CLASSES[compat.band])}>
              {compat.bandLabel} · {compat.overallScore} 分
            </p>
          </div>
          <Radar className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: '预算重叠', value: compat.budgetOverlapPct },
            { label: '风格相似', value: compat.styleSimilarityPct },
            { label: '节奏同步', value: compat.paceSyncPct },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{item.label}</span>
                <span className="tabular-nums">{item.value}%</span>
              </div>
              <Progress value={item.value} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>

      {data.highRiskAlerts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gate-reject-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            高风险预警
          </p>
          {data.highRiskAlerts.map((alert) => (
            <div key={alert.id} className="rounded-md border border-gate-reject-border/80 bg-gate-reject/50 dark:bg-gate-reject/20 px-3 py-2.5 space-y-1">
              <p className="text-sm font-medium">
                {alert.domainLabel} · {alert.memberAName} vs {alert.memberBName}
              </p>
              <p className="text-xs text-muted-foreground">{alert.summary}</p>
              {alert.recommendedStrategy ? (
                <p className="text-xs text-foreground/80 pt-1">{alert.recommendedStrategy}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {data.frictionMatrix.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">成员摩擦矩阵</p>
          {data.frictionMatrix.map((pair) => (
            <FrictionPairRow
              key={`${pair.memberAId}:${pair.memberBId}`}
              memberAName={pair.memberAName}
              memberBName={pair.memberBName}
              overallLevel={pair.overallLevel}
              cells={pair.cells}
            />
          ))}
        </div>
      ) : data.completedCount < 2 ? (
        <p className="text-xs text-muted-foreground">等待更多成员完成调查…</p>
      ) : null}
    </div>
  );
}
