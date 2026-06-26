import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { BudgetAllocations, StructureVsActual, TripBudgetProfile } from '@/types/trip-budget';
import {
  SPENDING_PERSONA_LABEL,
  SPENDING_PERSONA_PRESETS,
  STRUCTURE_CATEGORY_META,
  allocationsToPercentages,
  emptyAllocations,
  sumAllocations,
} from '@/lib/trip-budget-structure';
import { formatCurrency } from '@/utils/format';
import { AlertCircle } from 'lucide-react';

const BAR_TONES = ['bg-slate-900', 'bg-slate-600', 'bg-slate-400', 'bg-slate-300'] as const;

function StructureProportionBar({
  allocations,
  total,
}: {
  allocations: BudgetAllocations;
  total: number;
}) {
  if (total <= 0) return null;
  const segments = STRUCTURE_CATEGORY_META.filter((m) => m.key !== 'other').map((meta, i) => ({
    key: meta.key,
    pct: (allocations[meta.key] / total) * 100,
    tone: BAR_TONES[i % BAR_TONES.length],
  }));

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((seg) =>
        seg.pct > 0 ? (
          <div
            key={seg.key}
            className={cn('h-full transition-all', seg.tone)}
            style={{ width: `${seg.pct}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

interface BudgetStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentTotal: number;
  currency: string;
  structure: TripBudgetProfile['structure'];
  structureVsActual?: Partial<StructureVsActual>;
  saving: boolean;
  onSave: (allocations: BudgetAllocations) => Promise<void>;
  onApplyPersonaPreset: (percentages: BudgetAllocations) => Promise<void>;
  onEqualSplit: () => Promise<void>;
}

export default function BudgetStructureDialog({
  open,
  onOpenChange,
  intentTotal,
  currency,
  structure,
  structureVsActual,
  saving,
  onSave,
  onApplyPersonaPreset,
  onEqualSplit,
}: BudgetStructureDialogProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const persona = structure?.spendingPersona;

  const [draftAlloc, setDraftAlloc] = useState<BudgetAllocations>(emptyAllocations());

  useEffect(() => {
    if (structure?.allocations) {
      setDraftAlloc({ ...structure.allocations });
    }
  }, [open, structure?.allocations]);

  const draftSum = sumAllocations(draftAlloc);
  const draftValid = intentTotal > 0 && Math.abs(draftSum - intentTotal) <= 1;
  const draftPct = useMemo(
    () => (intentTotal > 0 ? allocationsToPercentages(intentTotal, draftAlloc) : emptyAllocations()),
    [draftAlloc, intentTotal],
  );

  const updateDraft = (key: keyof BudgetAllocations, value: number) => {
    setDraftAlloc((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleSave = async () => {
    await onSave(draftAlloc);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {isZh ? '消费偏好' : 'Spending structure'}
            {persona ? (
              <Badge variant="outline" className="text-[10px] border-slate-300 font-normal">
                {isZh ? SPENDING_PERSONA_LABEL[persona].zh : SPENDING_PERSONA_LABEL[persona].en}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? '钱更愿意花在哪 — 用于和行程预估比对，不影响记账'
              : 'How you want to allocate budget vs itinerary estimates'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex flex-wrap gap-1">
            {SPENDING_PERSONA_PRESETS.map((preset) => (
              <Button
                key={preset.persona}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] border-slate-200"
                disabled={saving}
                onClick={() => onApplyPersonaPreset(preset.percentages)}
              >
                {isZh ? preset.labelZh : preset.labelEn}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground"
              disabled={saving}
              onClick={onEqualSplit}
            >
              {isZh ? '均分' : 'Equal'}
            </Button>
          </div>

          <StructureProportionBar allocations={draftAlloc} total={intentTotal} />

          <ul className="space-y-1.5">
            {STRUCTURE_CATEGORY_META.filter((m) => m.key !== 'other').map((meta) => {
              const Icon = meta.icon;
              const vs = structureVsActual?.[meta.key];
              const overThreshold = vs && vs.variancePercent > 25;
              return (
                <li
                  key={meta.key}
                  className={cn(
                    'grid grid-cols-[auto_1fr_44px] items-center gap-2 rounded-lg border px-2.5 py-2 border-slate-200 bg-white',
                    overThreshold && 'border-slate-400',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <span className="text-[11px] text-muted-foreground">
                      {isZh ? meta.labelZh : meta.labelEn}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 mt-0.5 text-xs tabular-nums"
                      value={draftAlloc[meta.key] || ''}
                      onChange={(e) => updateDraft(meta.key, Number(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums text-right">
                    {draftPct[meta.key].toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>

          <p
            className={cn(
              'text-[11px] tabular-nums',
              draftValid ? 'text-muted-foreground' : 'text-destructive',
            )}
          >
            {formatCurrency(draftSum, currency)} / {formatCurrency(intentTotal, currency)}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={saving || !draftValid}
            onClick={handleSave}
          >
            {isZh ? '保存' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 主屏一行摘要 */
export function structureSummaryLine(
  allocations: BudgetAllocations,
  total: number,
  isZh: boolean,
): string {
  if (total <= 0) return '';
  const pct = allocationsToPercentages(total, allocations);
  const parts = STRUCTURE_CATEGORY_META.filter((m) => m.key !== 'other' && pct[m.key] >= 8)
    .sort((a, b) => pct[b.key] - pct[a.key])
    .slice(0, 3)
    .map((m) => {
      const label = isZh ? m.labelZh.split('/')[0] : m.labelEn;
      return `${label} ${pct[m.key].toFixed(0)}%`;
    });
  return parts.join(' · ');
}
