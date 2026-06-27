import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, GitCompare, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import { diffToneClassName } from '@/lib/solution-diff.util';
import { sliceSolutionMatrixRows } from '@/lib/solution-matrix-model';
import { cn } from '@/lib/utils';
import {
  trackSolutionMatrixColumnSelect,
  trackSolutionMatrixExpandDimensions,
  trackSolutionMatrixExpandPanel,
  trackSolutionMatrixImpression,
} from '@/utils/plan-studio-solution-matrix-analytics';
import {
  PlanningDetailsPanel,
  PlanningExpandToggle,
  PlanningHeaderCopy,
  PlanningHeaderIcon,
  PlanningHeaderRow,
  PlanningHeaderSection,
} from './plan-studio-header-ui';

export interface SolutionMatrixPanelProps {
  tripId: string;
  matrix: UseSolutionMatrixModelResult;
  embedded?: boolean;
  /** 与约束卡并排时的右列（桌面 ≥1024px） */
  layoutColumn?: 'end';
  /** options > 3 时在助手中查看更多 */
  onViewMoreInAssistant?: () => void;
  className?: string;
}

function SolutionMatrixTable({
  matrix,
  rowsExpanded,
  onColumnSelect,
}: {
  matrix: UseSolutionMatrixModelResult;
  rowsExpanded: boolean;
  onColumnSelect: (optionId: string, columnIndex: number) => void;
}) {
  const rows = sliceSolutionMatrixRows(matrix.model.rows, rowsExpanded);
  const { columns, selectedOptionId } = matrix;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[420px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="py-2 pr-3 text-left font-medium text-muted-foreground w-[88px]">维度</th>
            {columns.map((column, columnIndex) => {
              const selected = column.optionId === selectedOptionId;
              return (
                <th key={column.optionId} className="py-2 px-2 text-left font-medium min-w-[100px]">
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left transition-colors',
                      selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                    )}
                    onClick={() => onColumnSelect(column.optionId, columnIndex)}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.isRecommended ? (
                        <Star className="h-3 w-3 shrink-0 text-primary fill-primary/30" aria-hidden />
                      ) : null}
                      <span className="truncate">{column.label}</span>
                    </div>
                    {column.gateLabel ? (
                      <Badge variant="outline" className="mt-1 text-[9px] font-normal">
                        {column.gateLabel}
                      </Badge>
                    ) : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimensionId} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
              {row.cells.map((cell, index) => (
                <td key={`${row.dimensionId}-${columns[index]?.optionId ?? index}`} className="py-2 px-2">
                  <span
                    className={cn(
                      'inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 tabular-nums',
                      diffToneClassName(cell.diffTone),
                    )}
                  >
                    {cell.displayValue}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SolutionMatrixCarousel({
  matrix,
  onColumnSelect,
}: {
  matrix: UseSolutionMatrixModelResult;
  onColumnSelect: (optionId: string, columnIndex: number) => void;
}) {
  const { columns, selectedOptionId, model } = matrix;
  const selectedIndex = Math.max(
    0,
    columns.findIndex((c) => c.optionId === selectedOptionId),
  );
  const column = columns[selectedIndex];
  if (!column) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={selectedIndex <= 0}
          onClick={() => onColumnSelect(columns[selectedIndex - 1]!.optionId, selectedIndex - 1)}
        >
          上一个
        </Button>
        <span className="text-xs text-muted-foreground">
          {selectedIndex + 1} / {columns.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={selectedIndex >= columns.length - 1}
          onClick={() => onColumnSelect(columns[selectedIndex + 1]!.optionId, selectedIndex + 1)}
        >
          下一个
        </Button>
      </div>
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center gap-2">
          {column.isRecommended ? <Star className="h-3.5 w-3.5 text-primary" /> : null}
          <span className="text-sm font-medium">{column.label}</span>
          {column.gateLabel ? (
            <Badge variant="outline" className="text-[9px]">
              {column.gateLabel}
            </Badge>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {model.rows.slice(0, 4).map((row) => (
            <div key={row.dimensionId} className="flex justify-between gap-2 rounded bg-background/60 px-2 py-1">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  'font-medium tabular-nums',
                  diffToneClassName(row.cells[selectedIndex]?.diffTone ?? 'neutral'),
                )}
              >
                {row.cells[selectedIndex]?.displayValue ?? '—'}
              </dd>
            </div>
          ))}
        </dl>
        {column.caveat ? (
          <p className="text-[11px] text-muted-foreground leading-snug">{column.caveat}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SolutionMatrixPanel({
  tripId,
  matrix,
  embedded = false,
  layoutColumn,
  onViewMoreInAssistant,
  className,
}: SolutionMatrixPanelProps) {
  const isSideColumn = layoutColumn === 'end';
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { model, expanded, setExpanded, refreshing } = matrix;
  const [rowsExpanded, setRowsExpanded] = useState(false);
  const impressionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!model.visible) return;
    const key = `${tripId}:${model.columns.length}:${expanded}`;
    if (impressionRef.current === key) return;
    impressionRef.current = key;
    trackSolutionMatrixImpression({
      tripId,
      columnCount: model.columns.length,
      collapsed: !expanded,
    });
  }, [tripId, model.visible, model.columns.length, expanded]);

  const handleColumnSelect = (optionId: string, columnIndex: number) => {
    matrix.setSelectedOptionId(optionId);
    trackSolutionMatrixColumnSelect({ tripId, columnIndex, planId: optionId });
  };

  const handleTogglePanel = () => {
    const next = !expanded;
    setExpanded(next);
    trackSolutionMatrixExpandPanel({ tripId, expanded: next });
  };

  const handleToggleRows = () => {
    setRowsExpanded((value) => {
      const next = !value;
      trackSolutionMatrixExpandDimensions({ tripId, expanded: next });
      return next;
    });
  };

  if (!model.visible) return null;

  const canExpandRows = model.rows.length > 3;
  const hiddenOptionCount = Math.max(0, model.optionCount - model.columns.length);
  const showViewMoreInAssistant = hiddenOptionCount > 0 && Boolean(onViewMoreInAssistant);

  const viewMoreHint = showViewMoreInAssistant ? (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2',
        embedded ? 'mx-4 mb-3' : 'mx-5 mb-4',
        isSideColumn && 'mx-3',
      )}
    >
      <p className="text-[11px] text-muted-foreground leading-snug">
        还有 {hiddenOptionCount} 个方案未在主区展示（最多 3 列）
      </p>
      <Button
        type="button"
        variant="link"
        className="h-auto shrink-0 p-0 text-[11px] font-medium"
        onClick={onViewMoreInAssistant}
      >
        在助手中查看更多 →
      </Button>
    </div>
  ) : null;

  return (
    <PlanningHeaderSection
      accent="info"
      className={cn(isSideColumn && 'h-full lg:border-l-0', className)}
    >
      <PlanningHeaderRow className={cn('gap-3', embedded ? 'px-4 py-3' : 'px-5 py-3.5', isSideColumn && 'px-3 py-2')}>
        <PlanningHeaderIcon icon={GitCompare} accent="info" />
        <PlanningHeaderCopy
          kicker={t('planStudio.solutionMatrix.kicker', { defaultValue: '方案对比' })}
          title={t('planStudio.solutionMatrix.title', {
            defaultValue: `共 ${model.optionCount} 个候选方案`,
            count: model.optionCount,
          })}
        />
        <PlanningExpandToggle
          expanded={expanded}
          labelExpand={t('planStudio.solutionMatrix.expand', { defaultValue: '展开对比' })}
          labelCollapse={t('planStudio.solutionMatrix.collapse', { defaultValue: '收起对比' })}
          onClick={handleTogglePanel}
        />
      </PlanningHeaderRow>

      {!expanded && viewMoreHint}

      {expanded ? (
        <PlanningDetailsPanel className={cn(embedded ? 'px-4 pb-4' : 'px-5 pb-4', 'relative')}>
          {refreshing ? (
            <div
              className="absolute inset-0 z-10 flex flex-col gap-2 rounded-md bg-background/80 px-3 py-4 backdrop-blur-[1px]"
              aria-busy
              aria-label="正在根据约束更新方案对比"
            >
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {model.divergesFromLlm ? (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
              <p>
                {t('planStudio.solutionMatrix.kernelDivergence', {
                  defaultValue: '门控推荐与模型初荐不一致，请以门控推荐为准。',
                })}
              </p>
            </div>
          ) : null}

          {isMobile ? (
            <SolutionMatrixCarousel matrix={matrix} onColumnSelect={handleColumnSelect} />
          ) : (
            <SolutionMatrixTable
              matrix={matrix}
              rowsExpanded={rowsExpanded}
              onColumnSelect={handleColumnSelect}
            />
          )}

          {canExpandRows && !isMobile ? (
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleToggleRows}
              >
                <ChevronDown className={cn('h-3 w-3 mr-1 transition-transform', rowsExpanded && 'rotate-180')} />
                {rowsExpanded ? '收起维度' : '查看全部维度'}
              </Button>
            </div>
          ) : null}

          {!isMobile
            ? matrix.model.columns.map((column) =>
                column.caveat ? (
                  <p key={column.optionId} className="mt-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{column.label}：</span>
                    {column.caveat}
                  </p>
                ) : null,
              )
            : null}
          {viewMoreHint}
        </PlanningDetailsPanel>
      ) : null}
    </PlanningHeaderSection>
  );
}
