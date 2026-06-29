import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import type { SplitRuleCardModel } from './budget-split-rules.util';

export interface BudgetSplitRulesCardProps {
  isZh: boolean;
  cards: SplitRuleCardModel[];
  onViewDetails?: () => void;
}

export function BudgetSplitRulesCard({ isZh, cards, onViewDetails }: BudgetSplitRulesCardProps) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? '团队分摊规则' : 'Team split rules'}
        </h3>
        {onViewDetails ? (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-xs text-primary"
            onClick={onViewDetails}
          >
            {isZh ? '查看详情' : 'Details'}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={cn(
                'rounded-xl border px-2 py-2.5 text-center transition-colors',
                card.active
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-background',
              )}
            >
              <span
                className={cn(
                  'mx-auto flex h-9 w-9 items-center justify-center rounded-lg',
                  card.iconSurface,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[11px] font-semibold leading-tight text-foreground">
                {card.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                {card.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
