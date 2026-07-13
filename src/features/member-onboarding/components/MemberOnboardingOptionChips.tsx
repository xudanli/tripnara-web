import { cn } from '@/lib/utils';
import { guideImportUi } from '@/components/guide-import/guide-import-ui';

export interface MemberOnboardingOptionChipsProps {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** 最多可选数量；不传则不限制 */
  max?: number;
  className?: string;
}

export function MemberOnboardingOptionChips({
  options,
  selected,
  onChange,
  max,
  className,
}: MemberOnboardingOptionChipsProps) {
  const toggle = (option: string) => {
    const isOn = selected.includes(option);
    if (max === 1) {
      if (isOn) {
        onChange([]);
        return;
      }
      onChange([option]);
      return;
    }
    if (isOn) {
      onChange(selected.filter((s) => s !== option));
      return;
    }
    if (max != null && selected.length >= max) return;
    onChange([...selected, option]);
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isOn = selected.includes(option);
        const disabled = max != null && max > 1 && !isOn && selected.length >= max;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => toggle(option)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              isOn
                ? 'border-primary bg-primary/10 font-medium text-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-muted/30',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function MemberOnboardingOptionalNote({
  value,
  onChange,
  placeholder = '补充一句（可选）',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className={guideImportUi.footnote}>需要补充时再说一句即可，可不填</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
