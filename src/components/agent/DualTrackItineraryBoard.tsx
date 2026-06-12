import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUtilityRatio } from '@/lib/dual-track-itinerary-ui';
import type { DualTrackItineraryPayload } from '@/types/dual-track-itinerary';
import { GitBranch, Route } from 'lucide-react';

export interface DualTrackItineraryBoardProps {
  itinerary: DualTrackItineraryPayload;
  className?: string;
}

const ACTIVATION_LABELS: Record<string, string> = {
  auto: '自动触发',
  manual: '手动切换',
  on_confirm: '确认后启用',
};

function activationLabel(mode: string | undefined): string {
  if (!mode) return '—';
  return ACTIVATION_LABELS[mode] ?? mode;
}

export function DualTrackItineraryBoard({ itinerary, className }: DualTrackItineraryBoardProps) {
  const isDual = itinerary.mode === 'dual_track';
  const headline = itinerary.headline_zh?.trim() || (isDual ? '双轨行程看板' : '行程概览');

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" aria-hidden />
              {headline}
            </CardTitle>
            {isDual ? (
              <CardDescription className="mt-1 text-xs">
                A 轴为默认行程，B 轴为预案分支；Rollout 瓶颈会合并进 B 轴。
              </CardDescription>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={isDual ? 'default' : 'secondary'} className="text-[10px]">
              {isDual ? '双轨' : '单轨'}
            </Badge>
            {itinerary.regret_upper_bound != null && !Number.isNaN(itinerary.regret_upper_bound) ? (
              <Badge variant="outline" className="text-[10px] tabular-nums">
                遗憾上界 {formatUtilityRatio(itinerary.regret_upper_bound)}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn('grid gap-4', isDual ? 'md:grid-cols-2' : 'grid-cols-1')}>
          <section aria-label="A 轴默认行程">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Route className="h-3.5 w-3.5" aria-hidden />
              A 轴 · 默认行程
            </div>
            {itinerary.axis_a_segments.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无默认段</p>
            ) : (
              <ul className="space-y-2">
                {itinerary.axis_a_segments.map((seg) => (
                  <li
                    key={seg.segment_id}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                  >
                    <div className="text-[10px] text-muted-foreground tabular-nums">{seg.day_date}</div>
                    <div className="text-sm font-medium text-foreground">{seg.label_zh}</div>
                    {seg.item_ids?.length ? (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {seg.item_ids.length} 个条目
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isDual ? (
            <section aria-label="B 轴预案分支">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" aria-hidden />
                B 轴 · 预案分支
              </div>
              {itinerary.axis_b_branches.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无预案分支</p>
              ) : (
                <ul className="space-y-2">
                  {itinerary.axis_b_branches.map((branch) => (
                    <li
                      key={branch.branch_id}
                      className="rounded-lg border border-amber-500/25 bg-amber-50/40 px-3 py-2 dark:bg-amber-950/20"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {branch.trigger_label_zh}
                        </Badge>
                        {branch.expected_utility_ratio != null ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            预期效用 {formatUtilityRatio(branch.expected_utility_ratio)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{branch.summary_zh}</p>
                      {branch.trigger_condition ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          触发：{branch.trigger_condition}
                        </p>
                      ) : null}
                      {branch.activation_mode ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {activationLabel(branch.activation_mode)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
