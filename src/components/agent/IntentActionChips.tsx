import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type IntentActionChipItem = {
  id: string;
  label: string;
  /** 可随 chip 回传，用于覆盖 taskType / 二次确认 */
  taskTypeOverride?: string;
  payload?: Record<string, unknown>;
};

type IntentActionChipsProps = {
  chips: IntentActionChipItem[];
  onSelect: (chip: IntentActionChipItem) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * 模糊意图二次确认（例如：查通用攻略 vs 按当前行程估价）。
 * 父组件负责把选择结果写进下一条 route_and_run（如 options.intent_mode 或 message 文本）。
 */
export function IntentActionChips({ chips, onSelect, disabled, className }: IntentActionChipsProps) {
  if (!chips.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="意图选择">
      {chips.map((c) => (
        <Button
          key={c.id}
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 text-xs rounded-full"
          disabled={disabled}
          onClick={() => onSelect(c)}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}
