import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTripBudgetProfile } from '@/hooks/useTripBudgetProfile';
import { cn } from '@/lib/utils';
import {
  BUDGET_INTENT_PRESETS,
  SPENDING_PERSONA_LABEL,
  SPENDING_PERSONA_PRESETS,
  STRUCTURE_CATEGORY_META,
  allocationsFromPercentages,
  allocationsToPercentages,
  emptyAllocations,
  equalAllocations,
  sumAllocations,
} from '@/lib/trip-budget-structure';
import type { BudgetAllocations } from '@/types/trip-budget';
import { formatCurrency } from '@/utils/format';
import { ExternalLink, Layers3, Wallet } from 'lucide-react';

const BAR_TONES = ['bg-foreground', 'bg-foreground/70', 'bg-foreground/45', 'bg-foreground/25'] as const;

function StructureBar({ allocations, total }: { allocations: BudgetAllocations; total: number }) {
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
          <div key={seg.key} className={cn('h-full transition-all', seg.tone)} style={{ width: `${seg.pct}%` }} />
        ) : null,
      )}
    </div>
  );
}

interface PlanningBudgetConstraintsDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanningBudgetConstraintsDialog({
  tripId,
  open,
  onOpenChange,
}: PlanningBudgetConstraintsDialogProps) {
  const navigate = useNavigate();
  const {
    profile,
    loading,
    savingIntent,
    savingStructure,
    saveIntent,
    saveStructureFromAllocations,
    reload,
  } = useTripBudgetProfile(open ? tripId : null);

  const currency = profile?.intent?.currency ?? 'CNY';
  const savedTotal = profile?.intent?.total ?? 0;
  const persona = profile?.structure?.spendingPersona;

  const [totalInput, setTotalInput] = useState('');
  const [draftAlloc, setDraftAlloc] = useState<BudgetAllocations>(emptyAllocations());

  useEffect(() => {
    if (!open) return;
    setTotalInput(savedTotal > 0 ? String(savedTotal) : '');
    setDraftAlloc(
      profile?.structure?.allocations
        ? { ...profile.structure.allocations }
        : emptyAllocations(),
    );
  }, [open, savedTotal, profile?.structure?.allocations]);

  const draftTotal = Number(totalInput) || 0;
  const draftSum = sumAllocations(draftAlloc);
  const structureValid = draftTotal >= 100 && Math.abs(draftSum - draftTotal) <= 1;
  const draftPct = useMemo(
    () => (draftTotal > 0 ? allocationsToPercentages(draftTotal, draftAlloc) : emptyAllocations()),
    [draftAlloc, draftTotal],
  );

  const totalChanged = draftTotal >= 100 && draftTotal !== savedTotal;
  const structureChanged =
    draftTotal >= 100 &&
    STRUCTURE_CATEGORY_META.some(
      (m) => (profile?.structure?.allocations?.[m.key] ?? 0) !== draftAlloc[m.key],
    );
  const canSave =
    !savingIntent &&
    !savingStructure &&
    (totalChanged || (structureChanged && structureValid));

  const saving = savingIntent || savingStructure;

  const applyDraftPreset = (percentages: BudgetAllocations) => {
    if (draftTotal < 100) return;
    setDraftAlloc(allocationsFromPercentages(draftTotal, percentages));
  };

  const applyEqualDraft = () => {
    if (draftTotal < 100) return;
    setDraftAlloc(equalAllocations(draftTotal));
  };

  const handleSave = async () => {
    try {
      if (totalChanged) {
        await saveIntent(draftTotal, currency);
      }
      const effectiveTotal = totalChanged ? draftTotal : savedTotal;
      if (effectiveTotal >= 100 && structureChanged) {
        if (!structureValid) return;
        await saveStructureFromAllocations(draftAlloc);
      }
      await reload();
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            调整预算
          </DialogTitle>
        </DialogHeader>

        {loading && !profile ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 总预算 */}
            <section className="rounded-lg border border-border/70 bg-muted/15 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-muted-foreground">总预算</Label>
                {savedTotal > 0 ? (
                  <span className="text-lg font-semibold tabular-nums tracking-tight">
                    {formatCurrency(savedTotal, currency)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BUDGET_INTENT_PRESETS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-7 text-xs tabular-nums',
                      draftTotal === amount && 'border-foreground bg-muted/50 font-medium',
                    )}
                    disabled={saving}
                    onClick={() => setTotalInput(String(amount))}
                  >
                    {formatCurrency(amount, currency)}
                  </Button>
                ))}
              </div>

              <Input
                type="number"
                min={100}
                className="h-9 text-sm tabular-nums"
                placeholder="输入金额（元）"
                value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
              />
            </section>

            {/* 消费结构 */}
            {draftTotal >= 100 ? (
              <section className="rounded-lg border border-border/70 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">消费结构</p>
                      {persona ? (
                        <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[9px] font-normal">
                          {SPENDING_PERSONA_LABEL[persona].zh}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {SPENDING_PERSONA_PRESETS.map((preset) => (
                    <Button
                      key={preset.persona}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      disabled={saving}
                      onClick={() => applyDraftPreset(preset.percentages)}
                    >
                      {preset.labelZh}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground"
                    disabled={saving}
                    onClick={applyEqualDraft}
                  >
                    均分
                  </Button>
                </div>

                <StructureBar allocations={draftAlloc} total={draftTotal} />

                <ul className="space-y-1.5">
                  {STRUCTURE_CATEGORY_META.filter((m) => m.key !== 'other').map((meta) => {
                    const Icon = meta.icon;
                    return (
                      <li
                        key={meta.key}
                        className="grid grid-cols-[auto_1fr_40px] items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <span className="text-[11px] text-muted-foreground">{meta.labelZh}</span>
                          <Input
                            type="number"
                            min={0}
                            className="mt-0.5 h-7 text-xs tabular-nums"
                            value={draftAlloc[meta.key] || ''}
                            onChange={(e) =>
                              setDraftAlloc((prev) => ({
                                ...prev,
                                [meta.key]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
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
                    structureValid ? 'text-muted-foreground' : 'text-destructive',
                  )}
                >
                  {formatCurrency(draftSum, currency)} / {formatCurrency(draftTotal, currency)}
                </p>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground px-0.5">
                设置总预算后可分配消费结构
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=budget`);
                }}
              >
                记账与付款规则
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
