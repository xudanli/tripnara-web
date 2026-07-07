import { useEffect, useMemo, useState } from 'react';
import { Camera, Mic, PenLine } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { inTripMoneyApi } from '@/api/in-trip-money';
import type { CaptureMethod, MoneyNudge, RecordTransactionResult } from '@/types/in-trip-money';
import {
  IN_TRIP_CURRENCY_OPTIONS,
  IN_TRIP_MONEY_CATEGORIES,
} from '@/lib/in-trip-money';
import { InTripMoneyNudgeList } from './InTripMoneyNudgeList';

export interface MoneyRecordMember {
  userId: string;
  displayName: string;
}

interface InTripMoneyRecordDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MoneyRecordMember[];
  currentUserId?: string;
  defaultCurrency?: string;
  onRecorded?: (result: RecordTransactionResult) => void;
}

export function InTripMoneyRecordDialog({
  tripId,
  open,
  onOpenChange,
  members,
  currentUserId,
  defaultCurrency = 'CNY',
  onRecorded,
}: InTripMoneyRecordDialogProps) {
  const roster = useMemo(() => {
    if (members.length > 0) return members;
    if (currentUserId) return [{ userId: currentUserId, displayName: '我' }];
    return [];
  }, [members, currentUserId]);

  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('manual');
  const [amountLocal, setAmountLocal] = useState('');
  const [currencyLocal, setCurrencyLocal] = useState(defaultCurrency);
  const [category, setCategory] = useState('dining');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastNudges, setLastNudges] = useState<MoneyNudge[]>([]);
  const [showNudges, setShowNudges] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowNudges(false);
      setLastNudges([]);
      return;
    }
    const defaultPaid = roster.find((m) => m.userId === currentUserId)?.userId ?? roster[0]?.userId ?? '';
    setPaidByUserId(defaultPaid);
    setSplitIds(roster.map((m) => m.userId));
    setAmountLocal('');
    setMerchant('');
    setDescription('');
    setCategory('dining');
    setCurrencyLocal(defaultCurrency);
    setCaptureMethod('manual');
  }, [open, roster, currentUserId, defaultCurrency]);

  const toggleSplit = (userId: string, checked: boolean) => {
    setSplitIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      const next = prev.filter((id) => id !== userId);
      return next.length > 0 ? next : prev;
    });
  };

  const handleSubmit = async () => {
    const n = Number(amountLocal);
    if (!n || n <= 0 || !paidByUserId || splitIds.length === 0) {
      toast.error('请填写金额并选择分摊成员');
      return;
    }

    if (captureMethod !== 'manual') {
      toast.info('拍照/语音记账将在 Phase 2 接入，请先使用手输');
      return;
    }

    try {
      setSaving(true);
      const result = await inTripMoneyApi.recordTransaction(tripId, {
        captureMethod,
        amountLocal: n,
        currencyLocal,
        category,
        merchant: merchant.trim() || undefined,
        description: description.trim() || undefined,
        splitAmongUserIds: splitIds,
        paidByUserId,
      });

      setLastNudges(result.nudgesTriggered);
      setShowNudges(true);
      onRecorded?.(result);

      if (result.rebalanceSuggestionsCreated > 0) {
        toast.info('预算建议已更新，请查看再平衡卡片');
      }

      if (result.nudgesTriggered.length === 0) {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '记账失败');
    } finally {
      setSaving(false);
    }
  };

  const isGroup = roster.length >= 2;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setShowNudges(false);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>记一笔</DialogTitle>
          <DialogDescription>
            记入心理账户并同步 L3 钱包；系统自动评估数字助推
          </DialogDescription>
        </DialogHeader>

        {showNudges ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gate-allow-foreground font-medium">记账成功</p>
            <InTripMoneyNudgeList nudges={lastNudges} />
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                完成
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={captureMethod} onValueChange={(v) => setCaptureMethod(v as CaptureMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual" className="text-xs gap-1">
                  <PenLine className="h-3.5 w-3.5" />
                  手输
                </TabsTrigger>
                <TabsTrigger value="photo" className="text-xs gap-1">
                  <Camera className="h-3.5 w-3.5" />
                  拍照
                </TabsTrigger>
                <TabsTrigger value="voice" className="text-xs gap-1">
                  <Mic className="h-3.5 w-3.5" />
                  语音
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>金额</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={amountLocal}
                      onChange={(e) => setAmountLocal(e.target.value)}
                      placeholder="28000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>币种</Label>
                    <Select value={currencyLocal} onValueChange={setCurrencyLocal}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IN_TRIP_CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>类别</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IN_TRIP_MONEY_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>商户（可选）</Label>
                  <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>备注（可选）</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </TabsContent>
              <TabsContent value="photo" className="mt-3">
                <p className="text-sm text-muted-foreground py-4 text-center">
                  拍照 OCR 记账即将上线（Phase 2）
                </p>
              </TabsContent>
              <TabsContent value="voice" className="mt-3">
                <p className="text-sm text-muted-foreground py-4 text-center">
                  语音 ASR 记账即将上线（Phase 2）
                </p>
              </TabsContent>
            </Tabs>

            {isGroup && (
              <div className="space-y-2">
                <Label>付款人</Label>
                <Select value={paidByUserId} onValueChange={setPaidByUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择付款人" />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="pt-1">分摊成员</Label>
                <div className="space-y-2 rounded-md border p-2">
                  {roster.map((m) => (
                    <label key={m.userId} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={splitIds.includes(m.userId)}
                        onCheckedChange={(c) => toggleSplit(m.userId, c === true)}
                      />
                      {m.displayName}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="button" disabled={saving} onClick={handleSubmit}>
                {saving ? '提交中…' : '确认记账'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
