import { useState } from 'react';
import { useTripHikingAudit } from '@/hooks/useHikingDemo';
import { useLongestHike } from '@/hooks/useLongestHike';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HikingAuditCardProps {
  tripId: string;
  className?: string;
}

export function HikingAuditCard({ tripId, className }: HikingAuditCardProps) {
  const { longestHikeForQuery } = useLongestHike();
  const { data, isLoading, isError } = useTripHikingAudit(tripId, {
    longestHike: longestHikeForQuery,
  });
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-10">
          <Spinner className="h-6 w-6" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return null;
  }

  if (!data) return null;

  if (!data.eligible) {
    return (
      <Card className={cn('border-amber-200/60', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            行前徒步准备
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.reasonZh ?? '当前行程不适用徒步审计'}</p>
        </CardContent>
      </Card>
    );
  }

  const mustFindings = data.readinessFindings?.must ?? [];
  const showDaysCompare =
    data.tripPlannedDays != null &&
    data.routeSuggestedDays != null &&
    data.tripPlannedDays !== data.routeSuggestedDays;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          行前装备 · 地形
        </CardTitle>
        <CardDescription>terrainAdvice + gearChecklist + readinessFindings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(data.tripPlannedDays != null || data.routeSuggestedDays != null) && (
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              showDaysCompare
                ? 'border-amber-200 bg-amber-50/80 text-amber-950'
                : 'border-muted bg-muted/30'
            )}
          >
            <p>
              行程计划 <span className="font-medium">{data.tripPlannedDays ?? '—'}</span> 天
              {' · '}
              路线建议徒步{' '}
              <span className="font-medium">{data.routeSuggestedDays ?? '—'}</span> 天
            </p>
            {showDaysCompare && (
              <p className="mt-1 text-xs text-amber-800">
                总行程天数含交通/观光；徒步分段以路线建议天数为准。
              </p>
            )}
          </div>
        )}
        {data.terrainAdvice && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              地形适应
            </h4>
            <ul className="space-y-1.5 text-sm">
              {data.terrainAdvice.adaptationStrategies.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            {data.terrainAdvice.riskThresholds.length > 0 && (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.terrainAdvice.riskThresholds.map((t, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{t.labelZh}</dt>
                    <dd className="text-sm font-medium">{t.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {data.gearChecklist && data.gearChecklist.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              装备核对
            </h4>
            <ul className="space-y-2">
              {data.gearChecklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`gear-${item.id}`}
                    checked={checked[item.id] ?? item.level !== 'must'}
                    onCheckedChange={(v) =>
                      setChecked((prev) => ({ ...prev, [item.id]: v === true }))
                    }
                  />
                  <label htmlFor={`gear-${item.id}`} className="text-sm leading-snug">
                    {item.nameZh}
                    {item.level === 'must' && (
                      <span className="ml-1 text-[10px] text-red-600">必选</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mustFindings.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              必达项
            </h4>
            <ul className="space-y-3">
              {mustFindings.map((f, i) => (
                <li key={i} className="rounded-lg border border-red-200/50 bg-red-50/50 px-3 py-2 text-sm dark:bg-red-950/20">
                  <p>{f.message}</p>
                  {f.tasks && f.tasks.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                      {f.tasks.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
