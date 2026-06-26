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
import type { CreateLedgerEntryRequest, LedgerCategory, WalletMember } from '@/types/trip-budget';
import {
  defaultSplitMemberIds,
  ledgerCategoryOptions,
} from '@/lib/trip-budget-expense';

export interface BudgetAddExpenseFormValues {
  title: string;
  category: LedgerCategory;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitAmongUserIds: string[];
}

interface BudgetAddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  members: WalletMember[];
  currentUserId?: string;
  saving?: boolean;
  onSubmit: (values: BudgetAddExpenseFormValues) => Promise<void>;
}

export default function BudgetAddExpenseDialog({
  open,
  onOpenChange,
  currency,
  members,
  currentUserId,
  saving,
  onSubmit,
}: BudgetAddExpenseDialogProps) {
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

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LedgerCategory>('food');
  const [amount, setAmount] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitIds, setSplitIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const defaultPaid = roster[0]?.userId ?? currentUserId ?? '';
    setPaidByUserId(defaultPaid);
    setSplitIds(defaultSplitMemberIds(roster, currentUserId));
    setTitle('');
    setAmount('');
    setCategory('food');
  }, [open, roster, currentUserId]);

  const toggleSplit = (userId: string, checked: boolean) => {
    setSplitIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      const next = prev.filter((id) => id !== userId);
      return next.length > 0 ? next : prev;
    });
  };

  const handleSubmit = async () => {
    const n = Number(amount);
    if (!title.trim() || !n || n <= 0 || !paidByUserId || splitIds.length === 0) return;
    await onSubmit({
      title: title.trim(),
      category,
      amount: n,
      currency,
      paidByUserId,
      splitAmongUserIds: splitIds,
    });
    onOpenChange(false);
  };

  const isGroup = roster.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isZh ? '记一笔' : 'Add expense'}</DialogTitle>
          <DialogDescription>
            {isZh
              ? '手动记账会计入实际发生，并更新分摊欠账'
              : 'Manual entry updates actuals and split balances'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">{isZh ? '说明' : 'Title'}</Label>
            <Input
              className="h-8 text-sm"
              placeholder={isZh ? '如：超市补给、打车' : 'e.g. groceries, taxi'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '金额' : 'Amount'}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-8 text-sm tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '分类' : 'Category'}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as LedgerCategory)}>
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

          {roster.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '谁付的' : 'Paid by'}</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId}>
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
          ) : null}

          {isGroup ? (
            <div className="space-y-1.5">
              <Label className="text-xs">{isZh ? '分摊给谁' : 'Split among'}</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {roster.map((m) => (
                  <label key={m.userId} className="flex items-center gap-1.5 text-xs cursor-pointer">
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={saving || !title.trim() || !amount || Number(amount) <= 0}
            onClick={handleSubmit}
          >
            {isZh ? '确认记账' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function toCreateLedgerRequest(values: BudgetAddExpenseFormValues): CreateLedgerEntryRequest {
  return {
    title: values.title,
    category: values.category,
    amount: values.amount,
    currency: values.currency,
    paidByUserId: values.paidByUserId,
    splitAmongUserIds: values.splitAmongUserIds,
  };
}
