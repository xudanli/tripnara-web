import { AlertTriangle, Check } from 'lucide-react';
import type { ConsumerRepairOption } from '../api/types';
import { exploreUi, semanticGoodText, semanticWarnText } from '../explore-ui';
import { cn } from '@/lib/utils';

interface RepairOptionCardProps {
  option: ConsumerRepairOption;
  selected: boolean;
  onSelect: () => void;
}

export function RepairOptionCard({ option, selected, onSelect }: RepairOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-2xl border p-5 text-left transition-all w-full',
        selected ? exploreUi.cardSelected : exploreUi.cardHover,
      )}
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">{option.title}</h3>
      {option.summary && (
        <p className="text-xs text-muted-foreground mb-3">{option.summary}</p>
      )}
      {option.preserves && option.preserves.length > 0 && (
        <div className="mb-2">
          <p className={cn('text-[10px] font-medium mb-1', semanticGoodText)}>保留</p>
          <ul className="space-y-1">
            {option.preserves.map((p) => (
              <li key={p} className="text-[11px] flex gap-1.5">
                <Check className={cn('w-3.5 h-3.5', semanticGoodText)} />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {option.sacrifices && option.sacrifices.length > 0 && (
        <div>
          <p className={cn('text-[10px] font-medium mb-1', semanticWarnText)}>需要接受</p>
          <ul className="space-y-1">
            {option.sacrifices.map((s) => (
              <li key={s} className="text-[11px] flex gap-1.5">
                <AlertTriangle className={cn('w-3.5 h-3.5', semanticWarnText)} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </button>
  );
}
