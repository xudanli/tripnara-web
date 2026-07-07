import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CandidateComparisonRow,
  CandidateComparisonView,
  ComparisonDimensionStatus,
} from '@/types/candidate-comparison';
import {
  DecisionDrawerSection,
  DecisionDrawerSectionHeader,
} from '@/components/decision-problems/decision-center-ui';
import { Sparkles } from 'lucide-react';

const SAFETY_STATUS_CLASS: Partial<Record<ComparisonDimensionStatus, string>> = {
  PASS: 'text-gate-allow-foreground',
  FAIL: 'text-gate-reject-foreground',
  WARN: 'text-gate-confirm-foreground',
};

const PACE_STATUS_CLASS: Partial<Record<ComparisonDimensionStatus, string>> = {
  PASS: 'text-gate-allow-foreground',
  OVERLOADED: 'text-gate-reject-foreground',
  WARN: 'text-gate-confirm-foreground',
  FAIL: 'text-gate-reject-foreground',
};

function dimensionClass(
  status: ComparisonDimensionStatus | undefined,
  map: Partial<Record<ComparisonDimensionStatus, string>>,
  options?: { recommended?: boolean },
): string {
  if (!status) return 'text-foreground';
  if (options?.recommended && (status === 'OVERLOADED' || status === 'WARN')) {
    return 'text-gate-confirm-foreground';
  }
  return map[status] ?? 'text-foreground';
}

export interface CandidateComparisonViewPanelProps {
  view: CandidateComparisonView;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  className?: string;
}

/** Decision Core 四价值投影 — 原始意图 · 取舍矩阵 · 排除叙事 */
export function CandidateComparisonViewPanel({
  view,
  selectedCandidateId,
  onSelectCandidate,
  className,
}: CandidateComparisonViewPanelProps) {
  const activeId =
    selectedCandidateId ??
    view.recommendedCandidateId ??
    view.rows.find((row) => row.recommended)?.candidateId ??
    null;

  const intent = view.originalIntent;

  return (
    <div className={cn('space-y-3', className)}>
      {view.headline ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold leading-snug text-foreground">{view.headline}</p>
        </div>
      ) : null}

      {intent && (intent.labels?.length || intent.narrative) ? (
        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground">原始意图</p>
              {intent.labels?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {intent.labels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-[11px] font-normal">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {intent.narrative ? (
                <p
                  className={cn(
                    'text-xs leading-relaxed text-foreground/85',
                    intent.labels?.length ? 'mt-1.5' : 'mt-1',
                  )}
                >
                  {intent.narrative}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <DecisionDrawerSection>
        <DecisionDrawerSectionHeader title="Decision Core 方案对比" />
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/50 bg-background/80 shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/25">
                <th className="py-2.5 pl-3 pr-2 text-left text-[11px] font-semibold text-muted-foreground">
                  方案
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
                  安全
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
                  节奏
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
                  体验保留
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
                  费用
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <ComparisonRow
                  key={row.candidateId}
                  row={row}
                  selected={row.candidateId === activeId}
                  onSelect={
                    row.selectable !== false && onSelectCandidate
                      ? () => onSelectCandidate(row.candidateId)
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </DecisionDrawerSection>

      {view.rejections?.length ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">系统已排除的方案</p>
          <ul className="mt-1.5 space-y-1">
            {view.rejections.map((rejection) => (
              <li
                key={`${rejection.candidateId ?? 'rej'}-${rejection.message}`}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                · {rejection.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ComparisonRow({
  row,
  selected,
  onSelect,
}: {
  row: CandidateComparisonRow;
  selected: boolean;
  onSelect?: () => void;
}) {
  const clickable = Boolean(onSelect);
  const muted = row.selectable === false;

  return (
    <tr
      onClick={onSelect}
      className={cn(
        'border-b border-border/40 last:border-0 transition-colors',
        row.recommended && !selected && 'ring-1 ring-inset ring-gate-allow-border',
        selected && 'ring-2 ring-inset ring-primary/30 bg-primary/5',
        !row.recommended && selected && 'bg-primary/5',
        clickable && !muted && 'cursor-pointer hover:bg-muted/25',
        muted && 'opacity-60',
      )}
    >
      <td className="py-3 pl-3 pr-2 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('font-semibold', muted ? 'text-muted-foreground' : 'text-foreground')}>
            方案 {row.schemeLabel}
          </span>
          {row.recommended ? (
            <Badge variant="outline" className="border-gate-allow-border text-[11px] font-normal text-gate-allow-foreground">
              推荐
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-foreground/90">{row.title}</p>
        {row.drivingDeltaMinutes != null && row.drivingDeltaMinutes !== 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            驾驶{' '}
            {row.drivingDeltaMinutes > 0
              ? `+${row.drivingDeltaMinutes} 分钟`
              : `${row.drivingDeltaMinutes} 分钟`}
          </p>
        ) : null}
      </td>
      <td className="px-2 py-3 align-top">
        <DimensionCell cell={row.safety} statusClassMap={SAFETY_STATUS_CLASS} muted={muted} />
      </td>
      <td className="px-2 py-3 align-top">
        <DimensionCell
          cell={row.pace}
          statusClassMap={PACE_STATUS_CLASS}
          showNote
          recommended={row.recommended}
          muted={muted}
        />
      </td>
      <td className="px-2 py-3 align-top font-semibold tabular-nums text-foreground">
        {row.experienceRetentionLabel ?? '—'}
      </td>
      <td className="px-2 py-3 align-top font-medium tabular-nums text-foreground">
        {row.cost?.label ?? '—'}
      </td>
    </tr>
  );
}

function DimensionCell({
  cell,
  statusClassMap,
  showNote,
  recommended,
  muted,
}: {
  cell?: { status?: ComparisonDimensionStatus; label: string; note?: string };
  statusClassMap: Partial<Record<ComparisonDimensionStatus, string>>;
  showNote?: boolean;
  recommended?: boolean;
  muted?: boolean;
}) {
  if (!cell) return <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <span
        className={cn(
          'font-semibold',
          muted && 'text-muted-foreground',
          !muted && dimensionClass(cell.status, statusClassMap, { recommended }),
        )}
      >
        {cell.label}
      </span>
      {showNote && cell.note ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{cell.note}</p>
      ) : null}
    </div>
  );
}
