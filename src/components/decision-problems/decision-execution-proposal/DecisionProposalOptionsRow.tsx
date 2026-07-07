import { cn } from '@/lib/utils';
import type { DecisionProposalOptionView } from '@/lib/decision-proposal-option-view.util';
import { DecisionProposalOptionCard } from './DecisionProposalOptionCard';

export interface DecisionProposalOptionsRowProps {
  options: DecisionProposalOptionView[];
  selectedOptionId?: string | null;
  onSelect?: (optionId: string) => void;
  sectionTitle?: string;
  /** BFF optionCount — 方案卡未加载时展示标题 */
  optionCount?: number;
  className?: string;
  emptyMessage?: string;
  compact?: boolean;
}

/** 设计稿 · 「可选方案」三列横排 */
export function DecisionProposalOptionsRow({
  options,
  selectedOptionId,
  onSelect,
  sectionTitle = '可选方案',
  optionCount,
  className,
  emptyMessage = '暂无可选方案',
  compact = false,
}: DecisionProposalOptionsRowProps) {
  const count = options.length || optionCount || 0;

  if (!options.length && !count) {
    return (
      <p className={cn('py-8 text-center text-xs text-muted-foreground', className)}>{emptyMessage}</p>
    );
  }

  const resolvedTitle =
    count > 0 ? `可选方案（AI 为你生成 ${count} 个方案）` : sectionTitle;

  return (
    <section className={cn(compact ? 'space-y-1.5' : 'space-y-2.5', className)} role="radiogroup" aria-label="选择处理方式">
      <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>{resolvedTitle}</p>
      <div
        className={cn(
          'gap-2',
          options.length > 3
            ? 'flex overflow-x-auto pb-0.5 scrollbar-auto-hide'
            : cn(
                'grid grid-cols-1 sm:grid-cols-2',
                !compact && options.length > 2 && 'xl:grid-cols-3',
              ),
        )}
      >
        {options.map((option) => (
          <DecisionProposalOptionCard
            key={option.id}
            option={option}
            selected={selectedOptionId === option.id}
            onSelect={onSelect}
            compact={compact}
            className={options.length > 3 ? 'w-[min(100%,320px)] shrink-0 snap-start' : undefined}
          />
        ))}
      </div>
    </section>
  );
}
