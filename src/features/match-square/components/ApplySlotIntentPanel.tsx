import { Puzzle, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { ApplySlotIntent } from '../lib/apply-slot-intent';
import { AUTO_SLOT_VALUE } from '../lib/apply-slot-intent';
import { plazaChip } from '../lib/plaza-visual';

interface ApplySlotIntentPanelProps {
  intents: ApplySlotIntent[];
  value: string | null;
  onChange: (slotId: string) => void;
  className?: string;
}

/** 申请加入 — 补位意向（系统推荐 + 可选认领） */
export function ApplySlotIntentPanel({
  intents,
  value,
  onChange,
  className,
}: ApplySlotIntentPanelProps) {
  if (!intents.length) return null;

  const selected = value ?? AUTO_SLOT_VALUE;
  const topRecommended = intents.find((intent) => intent.recommended);

  return (
    <div className={cn('space-y-2 rounded-md border border-border bg-muted/20 p-2.5', className)}>
      <div className="space-y-0.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Puzzle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          补位意向
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          队长缺位如下。系统会根据你的画像推荐最契合的一格；也可改选或交给系统匹配。
        </p>
      </div>

      {topRecommended && selected === topRecommended.slotId && (
        <p className="flex items-center gap-1 rounded-md border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] px-2 py-1 text-[11px] text-[var(--gate-suggest-foreground)]">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
          系统判定你可补：{topRecommended.label}
        </p>
      )}

      <RadioGroup value={selected} onValueChange={onChange} className="gap-1.5">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 transition-colors',
            selected === AUTO_SLOT_VALUE
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-background hover:border-foreground/15'
          )}
        >
          <RadioGroupItem value={AUTO_SLOT_VALUE} id="apply-slot-auto" className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <Label htmlFor="apply-slot-auto" className="cursor-pointer text-xs font-medium">
              让系统匹配
            </Label>
            <p className="text-[11px] leading-snug text-muted-foreground">
              不指定具体缺位，由队长结合画像综合判断
            </p>
          </div>
        </label>

        {intents.map((intent) => (
          <label
            key={intent.slotId}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 transition-colors',
              selected === intent.slotId
                ? cn('border', plazaChip.puzzleHighlight)
                : 'border-border bg-background hover:border-foreground/15'
            )}
          >
            <RadioGroupItem value={intent.slotId} id={intent.slotId} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Label htmlFor={intent.slotId} className="cursor-pointer text-xs font-medium">
                  {intent.label}
                </Label>
                {intent.recommended && (
                  <span className="rounded-full border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] px-1.5 py-0 text-[10px] text-[var(--gate-suggest-foreground)]">
                    推荐
                  </span>
                )}
              </div>
              {intent.aiRationale && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  AI · {intent.aiRationale.replace(/^AI:\s*/i, '')}
                </p>
              )}
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
