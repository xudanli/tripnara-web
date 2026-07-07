import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PlanReviewItem } from '@/types/guide-to-plan-api';
import { cn } from '@/lib/utils';
import {
  GuideImportCard,
  GuideImportFooterActions,
  guideImportPrimaryButtonClass,
  guideImportUi,
} from '@/components/guide-import/guide-import-ui';

interface GuideReviewItemsViewProps {
  items: PlanReviewItem[];
  onConfirm: (acceptedItemKeys: string[]) => void;
  onBack?: () => void;
  confirming?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  className?: string;
}

function itemLabel(item: PlanReviewItem): string {
  return item.label ?? item.category ?? item.reviewKey;
}

export function GuideReviewItemsView({
  items,
  onConfirm,
  onBack,
  confirming,
  loading,
  confirmDisabled,
  className,
}: GuideReviewItemsViewProps) {
  const defaultKeys = useMemo(
    () => items.filter((i) => i.defaultSelected !== false).map((i) => i.reviewKey),
    [items],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultKeys));

  useEffect(() => {
    setSelected(new Set(defaultKeys));
  }, [defaultKeys]);

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(items.map((i) => i.reviewKey)) : new Set());
  };

  return (
    <div className={cn(guideImportUi.stackCompact, className)}>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          加载确认项…
        </div>
      ) : items.length === 0 ? (
        <GuideImportCard>
          <p className="text-sm text-muted-foreground">暂无可确认的调整项，可直接创建行程。</p>
        </GuideImportCard>
      ) : (
        <GuideImportCard padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleAll(v === true)}
              />
              全选
            </label>
            <span className="text-xs text-muted-foreground">
              已选 {selected.size} / {items.length}
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((item) => {
              const checked = selected.has(item.reviewKey);
              return (
                <li key={item.reviewKey} className="p-4">
                  <label className="flex gap-3 cursor-pointer">
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      onCheckedChange={(v) => toggle(item.reviewKey, v === true)}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium">{itemLabel(item)}</p>
                      {(item.originalGuide || item.adjustedPlan) && (
                        <div className="grid gap-2 sm:grid-cols-2 text-xs">
                          {item.originalGuide && (
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                                原攻略
                              </p>
                              <p className="text-muted-foreground leading-relaxed">
                                {item.originalGuide}
                              </p>
                            </div>
                          )}
                          {item.adjustedPlan && (
                            <div className="rounded-lg border border-border/50 bg-muted/15 p-2.5">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                                TripNARA 调整
                              </p>
                              <p className="text-foreground leading-relaxed">{item.adjustedPlan}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {item.reason && (
                        <p className={guideImportUi.footnote}>{item.reason}</p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </GuideImportCard>
      )}

      <GuideImportFooterActions
        secondary={
          onBack ? (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={onBack}>
              返回对比
            </Button>
          ) : undefined
        }
        primary={
          <Button
            type="button"
            size="lg"
            className={guideImportPrimaryButtonClass('min-w-[200px]')}
            disabled={confirming || loading || confirmDisabled || (items.length > 0 && selected.size === 0)}
            onClick={() => onConfirm([...selected])}
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建行程中…
              </>
            ) : confirmDisabled ? (
              '草案未就绪'
            ) : (
              '确认并创建行程'
            )}
          </Button>
        }
      />
    </div>
  );
}
