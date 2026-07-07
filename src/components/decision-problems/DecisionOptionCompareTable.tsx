import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  collectTradeoffDimensions,
  decisionOptionLabel,
  executionCapabilityLabel,
  executionCapabilityPreviewLabel,
  findTradeoffForDimension,
  formatTradeoffCell,
  tradeoffDimensionLabel,
  tradeoffDirectionClass,
} from '@/lib/decision-problem-display.util';
import type { DecisionOption } from '@/types/decision-problem';

export interface DecisionOptionCompareTableProps {
  options: DecisionOption[];
  selectedOptionId?: string | null;
  onSelectOption?: (optionId: string) => void;
  className?: string;
}

export function DecisionOptionCompareTable({
  options,
  selectedOptionId,
  onSelectOption,
  className,
}: DecisionOptionCompareTableProps) {
  if (options.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground py-4 text-center', className)}>
        暂无可选方案
      </p>
    );
  }

  const dimensions = collectTradeoffDimensions(options);
  const hasTradeoffs = dimensions.length > 0;

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border/50 bg-background/80', className)}>
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/95 py-2.5 pr-3 pl-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-[96px] backdrop-blur-sm">
              维度
            </th>
            {options.map((option) => {
              const selected = option.id === selectedOptionId;
              return (
                <th key={option.id} className="py-2 px-2 text-left font-medium min-w-[128px]">
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-lg px-2.5 py-2 text-left transition-all',
                      selected
                        ? 'bg-primary/12 ring-2 ring-primary/35'
                        : 'hover:bg-muted/50 ring-1 ring-transparent',
                      option.executable === false && 'opacity-50 cursor-not-allowed',
                    )}
                    disabled={option.executable === false}
                    onClick={() => onSelectOption?.(option.id)}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate">{decisionOptionLabel(option)}</span>
                      {option.executionCapability ? (
                        <Badge variant="outline" className="text-[9px] font-normal">
                          {executionCapabilityLabel(option.executionCapability)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[10px] font-normal text-primary">
                      {executionCapabilityPreviewLabel(option.executionCapability)}
                    </p>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hasTradeoffs ? (
            dimensions.map((dimension, rowIndex) => (
              <tr
                key={dimension}
                className={cn(
                  'border-b border-border/40 last:border-0',
                  rowIndex % 2 === 1 && 'bg-muted/15',
                )}
              >
                <td className="sticky left-0 z-10 bg-background/95 py-2.5 pr-3 pl-3 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                  {tradeoffDimensionLabel(dimension)}
                </td>
                {options.map((option) => {
                  const row = findTradeoffForDimension(option.tradeoffs, dimension);
                  return (
                    <td key={`${option.id}-${dimension}`} className="py-2 px-2 align-top">
                      {row ? (
                        <span
                          className={cn(
                            'inline-block leading-snug',
                            tradeoffDirectionClass(row.direction),
                          )}
                        >
                          {formatTradeoffCell(row)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={options.length + 1} className="py-3 text-center text-muted-foreground">
                方案暂无结构化 tradeoffs，请查看方案说明
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
