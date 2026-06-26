import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnpaidItem } from '@/types/trip';
import { formatLedgerCategoryLabel, costCategoryToLedgerCategory } from '@/lib/trip-budget-expense';
import { formatCurrency } from '@/utils/format';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface BudgetUnpaidSectionProps {
  items: UnpaidItem[];
  currency: string;
  onEdit: (item: UnpaidItem) => void;
  embedded?: boolean;
}

export default function BudgetUnpaidSection({
  items,
  currency,
  onEdit,
  embedded = false,
}: BudgetUnpaidSectionProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        'space-y-2',
        embedded ? 'mt-4 border-t border-border/60 pt-4' : 'border-t border-border/80 pt-3',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{isZh ? '待支付行程项' : 'Unpaid itinerary items'}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 8).map((item) => {
          const cat = costCategoryToLedgerCategory(item.costCategory);
          return (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.placeName ?? item.id.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatLedgerCategoryLabel(cat, isZh)}
                  {item.date ? ` · ${format(new Date(item.date), 'MM-dd')}` : ''}
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums shrink-0">
                {formatCurrency(item.estimatedCost ?? 0, item.currency ?? currency)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => onEdit(item)}
                aria-label={isZh ? '记费用' : 'Record cost'}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
      {items.length > 8 ? (
        <p className="text-[10px] text-muted-foreground text-center">
          {isZh ? `还有 ${items.length - 8} 项` : `${items.length - 8} more`}
        </p>
      ) : null}
    </section>
  );
}
