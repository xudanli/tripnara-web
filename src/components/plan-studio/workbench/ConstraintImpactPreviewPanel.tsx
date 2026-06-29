import { RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/utils/format';
import type { ConstraintImpactPreview } from './constraint-console-types';
import type { ConstraintPreviewSource } from '@/hooks/useConstraintImpactPreview';
import {
  workbenchCard,
  workbenchEmptySurface,
  workbenchFeasibilityBadge,
  workbenchInsightPanel,
  workbenchMajorDayChip,
  workbenchMinorDayChip,
} from './workbench-ui';

function displayFeasibilityScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  return null;
}

export interface ConstraintImpactPreviewPanelProps {
  preview: ConstraintImpactPreview | null;
  loading?: boolean;
  source?: ConstraintPreviewSource;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

function PreviewStatusBadge({
  loading,
  source,
}: {
  loading?: boolean;
  source?: ConstraintPreviewSource;
}) {
  if (loading) {
    return (
      <Badge
        variant="outline"
        className={cn('h-5 rounded-full px-2 text-[10px] font-normal', workbenchFeasibilityBadge)}
      >
        计算中…
      </Badge>
    );
  }
  if (source === 'bff') {
    return (
      <Badge
        variant="outline"
        className={cn('h-5 rounded-full px-2 text-[10px] font-normal', workbenchFeasibilityBadge)}
      >
        服务端预览
      </Badge>
    );
  }
  return null;
}

/** 右栏 · 即时影响预览（仅展示 BFF preview-impact 数据） */
export function ConstraintImpactPreviewPanel({
  preview,
  loading,
  source = 'idle',
  error,
  onRetry,
  className,
}: ConstraintImpactPreviewPanelProps) {
  const feasibilityBefore = preview ? displayFeasibilityScore(preview.feasibilityBefore) : null;
  const feasibilityAfter = preview ? displayFeasibilityScore(preview.feasibilityAfter) : null;
  const feasibilityDelta =
    feasibilityBefore != null && feasibilityAfter != null
      ? feasibilityAfter - feasibilityBefore
      : null;

  const showEmpty = !loading && !preview;

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-border/60 bg-muted/10',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">即时影响预览</h2>
        <PreviewStatusBadge loading={loading} source={source} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Spinner className="h-7 w-7" />
            <p className="text-xs text-muted-foreground">正在请求服务端预览…</p>
          </div>
        ) : null}

        {showEmpty ? (
          <div className={cn(workbenchEmptySurface, 'px-4 py-8 text-center')}>
            <p className="text-sm font-medium text-foreground">
              {source === 'idle' ? '选择可编辑约束以预览影响' : '暂无预览数据'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {error ??
                (source === 'idle'
                  ? '外部条件等只读项不支持即时预览。'
                  : '请确认后端 preview-impact 接口可用，或调整约束后重试。')}
            </p>
            {onRetry && source !== 'idle' ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 gap-1.5 text-xs"
                onClick={onRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                重新计算
              </Button>
            ) : null}
          </div>
        ) : null}

        {preview && !loading ? (
          <>
            {preview.affectedDays.length > 0 || preview.adjustmentSummary ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">受影响日程</p>
                {preview.affectedDays.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.affectedDays.map((day) => (
                      <span
                        key={day.dayNumber}
                        className={cn(
                          'relative rounded-lg border px-3 py-1.5 text-xs font-medium',
                          day.tone === 'major' ? workbenchMajorDayChip : workbenchMinorDayChip,
                        )}
                      >
                        第 {day.dayNumber} 天
                        {day.tone === 'major' ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-foreground/70" />
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                {preview.adjustmentSummary ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">{preview.adjustmentSummary}</p>
                ) : null}
              </section>
            ) : null}

            {feasibilityAfter != null ? (
              <section className={cn(workbenchCard, 'p-3')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {preview.planLabel ? (
                      <p className="text-xs font-semibold">{preview.planLabel}</p>
                    ) : null}
                    {preview.planNeedsAdjust ? (
                      <Badge
                        variant="outline"
                        className="mt-1 h-5 border-gate-confirm-border bg-gate-confirm/25 text-[10px] font-normal text-gate-confirm-foreground"
                      >
                        需调整
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {feasibilityAfter}
                      {feasibilityDelta != null ? (
                        <span
                          className={cn(
                            'ml-1 text-xs font-normal tabular-nums',
                            feasibilityDelta < 0
                              ? 'text-gate-reject-foreground'
                              : 'text-gate-allow-foreground',
                          )}
                        >
                          ({feasibilityDelta >= 0 ? '+' : ''}
                          {feasibilityDelta})
                        </span>
                      ) : null}
                    </p>
                    {feasibilityBefore != null ? (
                      <p className="text-[10px] text-muted-foreground line-through tabular-nums">
                        原 {feasibilityBefore}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {preview.budgetRows.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">预算影响</p>
                <div className="grid grid-cols-3 gap-2">
                  {preview.budgetRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-lg border border-border/60 bg-card px-2 py-2 text-center"
                    >
                      <p className="text-[10px] text-muted-foreground">{row.label}</p>
                      <p
                        className={cn(
                          'mt-0.5 text-xs font-semibold tabular-nums',
                          row.delta <= 0
                            ? 'text-gate-allow-foreground'
                            : 'text-gate-reject-foreground',
                        )}
                      >
                        {row.delta <= 0 ? '' : '+'}
                        {formatCurrency(row.delta, row.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {preview.diffBullets.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">差异摘要</p>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {preview.diffBullets.map((line, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-muted-foreground/50">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.recommendation ? (
              <div className={cn(workbenchInsightPanel, 'p-3')}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gate-suggest-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  建议
                </div>
                <p className="text-[11px] leading-relaxed text-foreground/80">{preview.recommendation}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
