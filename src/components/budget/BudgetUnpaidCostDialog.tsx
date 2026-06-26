import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CostCategory, ItemCostRequest, UnpaidItem } from '@/types/trip';
import type { LedgerCategory, WalletMember } from '@/types/trip-budget';
import {
  costCategoryToLedgerCategory,
  defaultSplitMemberIds,
  ledgerCategoryOptions,
  ledgerCategoryToCostCategory,
} from '@/lib/trip-budget-expense';
import { formatCurrency } from '@/utils/format';

export interface BudgetUnpaidCostFormValues {
  actualCost: number;
  costCategory: CostCategory;
  isPaid: boolean;
  paidBy?: string;
  splitAmongUserIds?: string[];
  autoLedger?: boolean;
}

interface BudgetUnpaidCostDialogProps {
  item: UnpaidItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  members: WalletMember[];
  currentUserId?: string;
  saving?: boolean;
  onSubmit: (itemId: string, data: ItemCostRequest) => Promise<void>;
}

export default function BudgetUnpaidCostDialog({
  item,
  open,
  onOpenChange,
  currency,
  members,
  currentUserId,
  saving,
  onSubmit,
}: BudgetUnpaidCostDialogProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const categoryOptions = useMemo(() => ledgerCategoryOptions(isZh), [isZh]);

  const roster = useMemo(() => {
    if (members.length > 0) return members;
    if (currentUserId) {
      return [{ userId: currentUserId, displayName: isZh ? '我' : 'Me' }];
    }
    return [];
  }, [members, currentUserId, isZh]);

  const [actualCost, setActualCost] = useState('');
  const [ledgerCategory, setLedgerCategory] = useState<LedgerCategory>('food');
  const [isPaid, setIsPaid] = useState(true);
  const [paidBy, setPaidBy] = useState('');
  const [splitIds, setSplitIds] = useState<string[]>([]);

  useEffect(() => {
    if (!item || !open) return;
    setActualCost(String(item.actualCost ?? item.estimatedCost ?? ''));
    setLedgerCategory(costCategoryToLedgerCategory(item.costCategory));
    setIsPaid(false);
    const defaultPaid = roster[0]?.userId ?? currentUserId ?? '';
    setPaidBy(defaultPaid);
    setSplitIds(defaultSplitMemberIds(roster, currentUserId));
  }, [item, open, roster, currentUserId]);

  const toggleSplit = (userId: string, checked: boolean) => {
    setSplitIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      const next = prev.filter((id) => id !== userId);
      return next.length > 0 ? next : prev;
    });
  };

  const handleSubmit = async () => {
    if (!item) return;
    const n = Number(actualCost);
    if (!n || n <= 0) return;
    const data: ItemCostRequest = {
      actualCost: n,
      costCategory: ledgerCategoryToCostCategory(ledgerCategory),
      currency: item.currency ?? currency,
      isPaid,
    };
    if (isPaid && paidBy) {
      data.paidBy = paidBy;
      data.splitAmongUserIds = splitIds;
      data.autoLedger = true;
    }
    await onSubmit(item.id, data);
    onOpenChange(false);
  };

  if (!item) return null;

  const label = item.placeName ?? (isZh ? '行程项' : 'Itinerary item');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isZh ? '记录行程费用' : 'Record item cost'}</DialogTitle>
          <DialogDescription className="truncate">{label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {item.estimatedCost != null ? (
            <p className="text-[11px] text-muted-foreground">
              {isZh ? '预估' : 'Est.'} {formatCurrency(item.estimatedCost, currency)}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '实际金额' : 'Actual'}</Label>
              <Input
                type="number"
                min={0}
                className="h-8 text-sm tabular-nums"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '分类' : 'Category'}</Label>
              <Select
                value={ledgerCategory}
                onValueChange={(v) => setLedgerCategory(v as LedgerCategory)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={isPaid} onCheckedChange={(v) => setIsPaid(v === true)} />
            {isZh ? '已支付（写入分摊账本）' : 'Paid (sync to wallet)'}
          </label>

          {isPaid && roster.length > 0 ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{isZh ? '谁付的' : 'Paid by'}</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((m) => (
                      <SelectItem key={m.userId} value={m.userId} className="text-xs">
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {roster.length >= 2 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">{isZh ? '分摊给谁' : 'Split among'}</Label>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {roster.map((m) => (
                      <label
                        key={m.userId}
                        className="flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <Checkbox
                          checked={splitIds.includes(m.userId)}
                          onCheckedChange={(v) => toggleSplit(m.userId, v === true)}
                        />
                        {m.displayName}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={saving || !actualCost || Number(actualCost) <= 0}
            onClick={handleSubmit}
          >
            {isZh ? '保存' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
