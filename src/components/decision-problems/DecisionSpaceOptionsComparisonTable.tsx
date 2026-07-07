import { cn } from '@/lib/utils';
import {
  collectTradeoffDimensions,
  findTradeoffForDimension,
  formatTradeoffCell,
  tradeoffDimensionLabel,
} from '@/lib/decision-problem-display.util';
import type { DecisionOption } from '@/types/decision-problem';

export interface DecisionSpaceOptionsComparisonTableProps {
  options: DecisionOption[];
  selectedOptionId?: string | null;
  baselineLabel?: string;
  className?: string;
}

const ROW_LABELS: Record<string, string> = {
  TIME: '交通缓冲',
  FLEXIBILITY: '可行度',
  POI_COVERAGE: '核心体验',
  FATIGUE: '体力消耗',
  SAFETY: '安全余量',
  COMFORT: '舒适度',
  GROUP_FAIRNESS: '成员公平',
};

function formatBaselineCell(row: ReturnType<typeof findTradeoffForDimension>): string {
  if (!row) return '—';
  if (row.baselineValue != null && row.unit === 'PERCENT') {
    return `${row.baselineValue}%`;
  }
  return row.explanation?.trim() || formatTradeoffCell(row);
}

function formatOptionCell(row: ReturnType<typeof findTradeoffForDimension>): string {
  if (!row) return '—';
  return row.explanation?.trim() || formatTradeoffCell(row);
}

/** 调整前后对比 · 当前计划 vs 方案 A/B/C（设计稿多列表） */
export function DecisionSpaceOptionsComparisonTable({
  options,
  selectedOptionId,
  baselineLabel = '当前计划',
  className,
}: DecisionSpaceOptionsComparisonTableProps) {
  if (options.length === 0) return null;

  const dimensions = collectTradeoffDimensions(options);
  if (dimensions.length === 0) return null;

  const selectedId = selectedOptionId ?? options[0]?.id;

  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/50', className)}>
      <div className="border-b border-border/50 px-3 py-2">
        <p className="text-xs font-semibold text-foreground">调整前后对比</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          该结果基于当前道路与预约预测；条件变化时系统会重新触发判断。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border/40 bg-muted/15">
              <th className="py-2 pl-3 pr-2 text-left font-medium text-muted-foreground">项目</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                {baselineLabel}
              </th>
              {options.map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const selected = option.id === selectedId;
                return (
                  <th
                    key={option.id}
                    className={cn(
                      'px-2 py-2 text-left font-medium',
                      selected ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    方案 {letter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dimension) => {
              const baselineRow = findTradeoffForDimension(options[0]?.tradeoffs, dimension);
              return (
                <tr key={dimension} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pl-3 pr-2 text-muted-foreground">
                    {ROW_LABELS[dimension] ?? tradeoffDimensionLabel(dimension)}
                  </td>
                  <td className="px-2 py-2 text-foreground/90">{formatBaselineCell(baselineRow)}</td>
                  {options.map((option) => {
                    const row = findTradeoffForDimension(option.tradeoffs, dimension);
                    const selected = option.id === selectedId;
                    return (
                      <td
                        key={`${option.id}-${dimension}`}
                        className={cn(
                          'px-2 py-2',
                          selected ? 'font-medium text-foreground' : 'text-foreground/90',
                        )}
                      >
                        {formatOptionCell(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
