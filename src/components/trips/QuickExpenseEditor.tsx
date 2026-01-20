import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wallet, Edit2 } from 'lucide-react';
import { formatCurrency as formatCurrencyAmount } from '@/utils/format';
import { toast } from 'sonner';

interface QuickExpenseEditorProps {
  itemId: string;
  itemName: string;
  currentAmount?: number;
  currency?: string;
  onSave: (amount: number) => Promise<void>;
  trigger?: React.ReactNode;
}

export default function QuickExpenseEditor({
  itemId,
  itemName,
  currentAmount,
  currency = 'CNY',
  onSave,
  trigger,
}: QuickExpenseEditorProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(currentAmount?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error('请输入有效的金额');
      return;
    }

    try {
      setSaving(true);
      await onSave(numAmount);
      toast.success('支出记录已更新');
      setOpen(false);
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      toast.error(err.message || '保存支出记录失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 px-2"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              编辑支出记录
            </DialogTitle>
            <DialogDescription>
              为行程项 "{itemName}" 记录实际支出
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>实际支出金额</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{currency}</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="flex-1"
                />
              </div>
              {currentAmount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  当前记录: {formatCurrencyAmount(currentAmount, currency)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
