import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/utils/format';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import { formatConstraintPreviewChangeValue } from '@/lib/constraint-catalog-editor.util';
import type { ConstraintImpactAffectedDayDetail, ConstraintImpactPreview } from './constraint-console-types';
import type { ConstraintPreviewSource } from '@/hooks/useConstraintImpactPreview';
import { normalizeFeasibilityScore } from './constraint-console-view.util';
import {
  workbenchCard,
  workbenchEmptySurface,
  workbenchFeasibilityBadge,
  workbenchInsightPanel,
  workbenchMajorDayChip,
  workbenchMinorDayChip,
  workbenchSegmentSelected,
} from './workbench-ui';

function displayFeasibilityScore(value: unknown): number | null {
  const normalized = normalizeFeasibilityScore(value, Number.NaN);
  if (!Number.isFinite(normalized) || normalized <= 0) return null;
  return Math.round(normalized);
}

function formatDelta(value: number, suffix = ''): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

function ConflictCountRow({
  label,
  before,
  after,
}: {
  label: string;
  before?: number;
  after?: number;
}) {
  if (before == null && after == null) return null;
  const b = before ?? 0;
  const a = after ?? 0;
  const delta = a - b;
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        <span className="text-muted-foreground">{b}</span>
        <span className="mx-1 text-muted-foreground/50">→</span>
        <span className="font-medium text-foreground">{a}</span>
        {delta !== 0 ? (
          <span
            className={cn(
              'ml-1.5 text-[10px]',
              delta > 0 ? 'text-error' : 'text-success',
            )}
          >
            ({formatDelta(delta)})
          </span>
        ) : null}
      </span>
    </div>
  );
}

export interface ConstraintImpactPreviewPanelProps {
  preview: ConstraintImpactPreview | null;
  loading?: boolean;
  source?: ConstraintPreviewSource;
  error?: string | null;
  onRetry?: () => void;
  /** 空态说明（drawer 延迟预览等） */
  emptyHint?: string | null;
  className?: string;
}

function PreviewStatusBadge({
  loading,
  source,
  refreshType,
}: {
  loading?: boolean;
  source?: ConstraintPreviewSource;
  refreshType?: ConstraintImpactPreview['refreshType'];
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
        {refreshType === 'deep' ? '完整检查' : '完整检查中'}
      </Badge>
    );
  }
  return null;
}

function formatChangeCell(value: unknown, unit?: string): string {
  const formatted = formatConstraintPreviewChangeValue(value, unit);
  if (formatted != null) return formatted;
  if (value == null) return '—';
  if (typeof value === 'number' || typeof value === 'string') {
    return unit ? `${value} ${unit}` : String(value);
  }
  return coerceDisplayText(value) ?? '—';
}

function AffectedScheduleSection({
  preview,
}: {
  preview: ConstraintImpactPreview;
}) {
  const dayDetails = preview.affectedDayDetails ?? [];
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  useEffect(() => {
    const preferred =
      preview.affectedDays.find((day) => day.tone === 'major')?.dayNumber ??
      preview.affectedDays[0]?.dayNumber ??
      dayDetails[0]?.dayNumber ??
      null;
    setSelectedDayNumber(preferred);
  }, [preview.affectedDays, dayDetails]);

  const selectedDetail = useMemo((): ConstraintImpactAffectedDayDetail | null => {
    if (selectedDayNumber == null) return null;
    return dayDetails.find((day) => day.dayNumber === selectedDayNumber) ?? null;
  }, [dayDetails, selectedDayNumber]);

  const selectedTone =
    preview.affectedDays.find((day) => day.dayNumber === selectedDayNumber)?.tone ??
    selectedDetail?.tone;

  if (preview.affectedDays.length === 0 && !preview.adjustmentSummary) return null;

  return (
    <section>
      <div className="mb-2">
        <p className="text-xs font-medium text-foreground">受影响日程</p>
        {preview.adjustmentSummary ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{preview.adjustmentSummary}</p>
        ) : null}
      </div>
      {preview.affectedDays.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {preview.affectedDays.map((day) => {
            const selected = day.dayNumber === selectedDayNumber;
            const hasDetails = dayDetails.some((detail) => detail.dayNumber === day.dayNumber);
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                disabled={!hasDetails && dayDetails.length > 0}
                className={cn(
                  'relative rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  selected
                    ? workbenchSegmentSelected
                    : day.tone === 'major'
                      ? workbenchMajorDayChip
                      : workbenchMinorDayChip,
                  hasDetails || dayDetails.length === 0
                    ? 'cursor-pointer hover:border-foreground/30'
                    : 'cursor-default opacity-70',
                )}
              >
                第 {day.dayNumber} 天
                {day.tone === 'major' && !selected ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-foreground/70" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedDetail && selectedDetail.items.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
          <p className="text-[11px] font-medium text-foreground">
            第 {selectedDetail.dayNumber} 天 · 受影响活动
            {selectedTone === 'major' ? (
              <span className="ml-1.5 font-normal text-muted-foreground">主要调整</span>
            ) : null}
          </p>
          <ul className="mt-2 space-y-2">
            {selectedDetail.items.map((item) => (
              <li key={item.itemId ?? `${selectedDetail.dayNumber}-${item.label}`} className="text-[11px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium text-foreground">{item.label}</span>
                  {item.startTimeLabel ? (
                    <span className="shrink-0 tabular-nums text-muted-foreground">{item.startTimeLabel}</span>
                  ) : null}
                </div>
                {item.detail ? (
                  <p className="mt-0.5 leading-snug text-muted-foreground">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : selectedDayNumber != null && dayDetails.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">该日暂无活动级明细。</p>
      ) : null}
    </section>
  );
}

/** 右栏 · 即时影响预览（BFF preview-impact） */
export function ConstraintImpactPreviewPanel({
  preview,
  loading,
  source = 'idle',
  error,
  onRetry,
  emptyHint,
  className,
}: ConstraintImpactPreviewPanelProps) {
  const feasibilityBefore = preview ? displayFeasibilityScore(preview.feasibilityBefore) : null;
  const feasibilityAfter = preview ? displayFeasibilityScore(preview.feasibilityAfter) : null;
  const scoreDelta = preview?.executeabilityDelta?.scoreDelta;
  const feasibilityDelta =
    scoreDelta != null
      ? Math.round(scoreDelta)
      : feasibilityBefore != null && feasibilityAfter != null
        ? feasibilityAfter - feasibilityBefore
        : null;

  const showEmpty = !loading && !preview;
  const recommendations =
    preview?.recommendations?.length
      ? preview.recommendations
      : preview?.recommendation
        ? [preview.recommendation]
        : [];

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-border/60 bg-muted/10',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">如果应用这次修改</h2>
        <PreviewStatusBadge loading={loading} source={source} refreshType={preview?.refreshType} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Spinner className="h-7 w-7" />
            <p className="text-xs font-medium text-foreground">正在根据你的修改估算影响…</p>
            <p className="text-[11px] text-muted-foreground">通常需要 2–5 秒</p>
          </div>
        ) : null}

        {showEmpty ? (
          <div className={cn(workbenchEmptySurface, 'px-4 py-8 text-center')}>
            <p className="text-sm font-medium text-foreground">
              {emptyHint
                ? '等待确认修改'
                : source === 'idle'
                  ? '选择一条条件查看影响'
                  : '暂无影响估算'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {error ??
                emptyHint ??
                (source === 'idle'
                  ? '官方规则等只读项不支持影响估算。'
                  : '请调整条件后重试，或稍后再试完整检查。')}
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
            {preview.suggestedFollowUp ? (
              <div className="rounded-lg border border-border bg-muted/15 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <div>
                    <p className="text-[11px] font-medium text-foreground">建议后续操作</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {preview.suggestedFollowUp}
                    </p>
                  </div>
                </div>
              </div>
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
                        className="mt-1 h-5 border-border bg-muted/25 text-[10px] font-normal text-warning"
                      >
                        需调整
                      </Badge>
                    ) : null}
                    {preview.executeabilityDelta?.mustHandleDelta != null &&
                    preview.executeabilityDelta.mustHandleDelta !== 0 ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        必处理冲突变化：
                        <span
                          className={cn(
                            'ml-1 font-medium tabular-nums',
                            preview.executeabilityDelta.mustHandleDelta > 0
                              ? 'text-error'
                              : 'text-success',
                          )}
                        >
                          {formatDelta(preview.executeabilityDelta.mustHandleDelta)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">可执行性</p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {feasibilityAfter}
                      {feasibilityDelta != null ? (
                        <span
                          className={cn(
                            'ml-1 text-xs font-normal tabular-nums',
                            feasibilityDelta < 0
                              ? 'text-error'
                              : 'text-success',
                          )}
                        >
                          ({formatDelta(feasibilityDelta)})
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

            {preview.conflictsBefore || preview.conflictsAfter ? (
              <section className="rounded-xl border border-border/60 p-3">
                <p className="mb-2 text-xs font-medium text-foreground">冲突变化</p>
                <div className="space-y-1.5">
                  <ConflictCountRow
                    label="必须处理"
                    before={preview.conflictsBefore?.mustHandle}
                    after={preview.conflictsAfter?.mustHandle}
                  />
                  <ConflictCountRow
                    label="建议调整"
                    before={preview.conflictsBefore?.suggestAdjust}
                    after={preview.conflictsAfter?.suggestAdjust}
                  />
                  <ConflictCountRow
                    label="待确认"
                    before={preview.conflictsBefore?.pendingConfirm}
                    after={preview.conflictsAfter?.pendingConfirm}
                  />
                </div>
              </section>
            ) : null}

            {preview.structuredImpact?.constraintChanges &&
            preview.structuredImpact.constraintChanges.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">约束变化</p>
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-left text-muted-foreground">
                        <th className="px-2.5 py-1.5 font-medium">约束</th>
                        <th className="px-2.5 py-1.5 font-medium">变更前</th>
                        <th className="px-2.5 py-1.5 font-medium">变更后</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.structuredImpact.constraintChanges.map((change) => (
                        <tr
                          key={change.constraintId}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-2.5 py-1.5 text-foreground">
                            {change.name ?? change.constraintId}
                          </td>
                          <td className="px-2.5 py-1.5 tabular-nums text-muted-foreground">
                            {formatChangeCell(change.before, change.unit)}
                          </td>
                          <td className="px-2.5 py-1.5 tabular-nums font-medium text-foreground">
                            {formatChangeCell(change.after, change.unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {preview.structuredImpact?.schedule?.poisToRelocate &&
            preview.structuredImpact.schedule.poisToRelocate.length > 0 &&
            !(preview.affectedDayDetails?.some((day) => day.items.length > 0)) ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">可能移动的景点</p>
                <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2">
                  {preview.structuredImpact.schedule.poisToRelocate.map((poi, index) => (
                    <li
                      key={poi.itemId ?? `${poi.dayNumber}-${index}`}
                      className="flex items-baseline justify-between gap-2 text-[11px]"
                    >
                      <span className="truncate text-foreground">
                        {poi.label ?? poi.itemId ?? '未命名景点'}
                      </span>
                      {poi.dayNumber != null ? (
                        <span className="shrink-0 text-muted-foreground">第 {poi.dayNumber} 天</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.affectedDays.length > 0 || preview.adjustmentSummary ? (
              <AffectedScheduleSection preview={preview} />
            ) : null}

            {preview.affectedItemIds && preview.affectedItemIds.length > 0 &&
            !preview.structuredImpact?.schedule?.poisToRelocate?.length ? (
              <section>
                <p className="mb-2 text-xs font-medium text-foreground">
                  受影响行程项
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ({preview.affectedItemIds.length})
                  </span>
                </p>
                <ul className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2">
                  {preview.affectedItemIds.slice(0, 12).map((itemId) => (
                    <li key={itemId} className="truncate font-mono text-[10px] text-muted-foreground">
                      {itemId}
                    </li>
                  ))}
                  {preview.affectedItemIds.length > 12 ? (
                    <li className="text-[10px] text-muted-foreground">
                      还有 {preview.affectedItemIds.length - 12} 项…
                    </li>
                  ) : null}
                </ul>
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
                            ? 'text-success'
                            : 'text-error',
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
                      <span>{coerceDisplayText(line) ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recommendations.length > 0 ? (
              <div className={cn(workbenchInsightPanel, 'p-3')}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  {recommendations.length > 1 ? '建议' : '建议'}
                </div>
                <ul className="space-y-1.5">
                  {recommendations.map((line, i) => (
                    <li key={i} className="text-[11px] leading-relaxed text-foreground/80">
                      {recommendations.length > 1
                        ? `· ${coerceDisplayText(line) ?? '—'}`
                        : coerceDisplayText(line) ?? '—'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
