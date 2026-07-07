import { cn } from '@/lib/utils';
import { DecisionActionCard } from '@/components/decision-problems/DecisionActionCard';
import { buildDecisionSpaceResultLayersFromAction } from '@/lib/decision-space-result-card.util';
import type { DecisionOption } from '@/types/decision-problem';
import type { DecisionAction } from '@/generated/unified-decision-contracts';

export interface DecisionActionsPanelProps {
  actions: DecisionAction[];
  selectedActionId?: string | null;
  displayTimezone?: string;
  onSelect?: (action: DecisionAction) => void;
  className?: string;
  emptyMessage?: string;
  /** P1 · 问题模板标题 */
  sectionTitle?: string;
  /** 与 actions 对齐的 options（用于结果卡分层） */
  options?: DecisionOption[];
  /** 工作台中栏：最多 2 列，避免三栏布局下卡片过窄 */
  maxColumns?: 2 | 3;
  /** 单行横向滚动（工作台决策空间） */
  layout?: 'grid' | 'horizontal-scroll';
}

/** 工作台：≤3 三等分网格；>3 同宽横滑。高度随内容，不固定留白。 */
const workbenchActionScrollCardWidth =
  'w-[calc((100%-1.25rem)/3)] min-w-[calc((100%-1.25rem)/3)] shrink-0 snap-start';

/** SSOT v2 — detail.actions[] · 单选列表（基于 DecisionActionCard） */
export function DecisionActionsPanel({
  actions,
  selectedActionId,
  displayTimezone,
  onSelect,
  className,
  emptyMessage = '暂无可选方案',
  sectionTitle = '可选方案',
  options = [],
  maxColumns = 3,
  layout = 'grid',
}: DecisionActionsPanelProps) {
  if (!actions.length) {
    return (
      <p className={cn('px-1 py-6 text-center text-xs text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="radiogroup" aria-label="选择处理方式">
      <p className="px-0.5 text-xs font-semibold text-foreground">{sectionTitle}</p>
      {layout === 'horizontal-scroll' ? (
        <div
          className={cn(
            'gap-2.5 pb-1',
            actions.length > 3
              ? 'flex overflow-x-auto scrollbar-auto-hide'
              : 'grid grid-cols-3',
          )}
        >
          {actions.map((action, index) => {
            const matchedOption = options.find((row) => row.id === action.actionId) ?? null;
            const resultLayers = buildDecisionSpaceResultLayersFromAction(action, matchedOption);
            return (
            <DecisionActionCard
              key={action.actionId}
              action={action}
              variant="select"
              selected={selectedActionId === action.actionId}
              recommended={index === 0}
              resultLayers={resultLayers}
              displayTimezone={displayTimezone}
              onSelect={onSelect}
              compact
              className={actions.length > 3 ? workbenchActionScrollCardWidth : undefined}
            />
            );
          })}
        </div>
      ) : (
      <div
        className={cn(
          'grid gap-3',
          actions.length <= 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : maxColumns === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {actions.map((action, index) => {
          const matchedOption = options.find((row) => row.id === action.actionId) ?? null;
          const resultLayers = buildDecisionSpaceResultLayersFromAction(action, matchedOption);
          return (
          <DecisionActionCard
            key={action.actionId}
            action={action}
            variant="select"
            selected={selectedActionId === action.actionId}
            recommended={index === 0}
            resultLayers={resultLayers}
            displayTimezone={displayTimezone}
            onSelect={onSelect}
            className="h-full"
          />
          );
        })}
      </div>
      )}
    </div>
  );
}
