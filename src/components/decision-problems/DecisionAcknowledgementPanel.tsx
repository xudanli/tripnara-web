import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DecisionAcknowledgementPanelProps {
  items: string[];
  checked: string[];
  onToggle: (item: string, checked: boolean) => void;
  className?: string;
  title?: string;
}

/** preview.acknowledgementRequired — 提交/应用前需用户勾选 */
export function DecisionAcknowledgementPanel({
  items,
  checked,
  onToggle,
  className,
  title,
}: DecisionAcknowledgementPanelProps) {
  if (!items.length) return null;

  const titleTrim = title?.trim();

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border border-gate-confirm-border/60 bg-gate-confirm/10 px-3 py-3',
        className,
      )}
    >
      {titleTrim ? <p className="text-xs font-medium text-foreground">{titleTrim}</p> : null}
      <ul className="space-y-2">
        {items.map((item) => {
          const id = `decision-ack-${item.slice(0, 24).replace(/\s+/g, '-')}`;
          const isChecked = checked.includes(item);
          return (
            <li key={item} className="flex items-start gap-2">
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={(value) => onToggle(item, value === true)}
                className="mt-0.5"
              />
              <Label htmlFor={id} className="text-[11px] font-normal leading-snug text-foreground">
                {item}
              </Label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
