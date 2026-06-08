import { useState } from 'react';
import { format } from 'date-fns';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MatchSquareApiError } from '@/api/match-square';
import {
  usePatchTravelIntentStatus,
  useTravelIntent,
  useUpsertTravelIntent,
} from '../hooks/useMatchSquare';
import { formatDateRangeLabel } from '../lib/mock-data';
import { plazaBadge, plazaGateStatusDot } from '../lib/plaza-visual';

interface TravelIntentBannerProps {
  className?: string;
  /** 与匹配视角合并为单行工具条 */
  compact?: boolean;
}

function intentDateLabel(intent: {
  startDate?: string;
  endDate?: string;
  dateRangeLabel?: string;
}): string | undefined {
  if (intent.startDate && intent.endDate) {
    return formatDateRangeLabel(intent.startDate, intent.endDate);
  }
  return intent.dateRangeLabel;
}

/** 3.7.2 队员挂起旅行意向 — POST /my/travel-intent + PATCH status */
export function TravelIntentBanner({ className, compact = false }: TravelIntentBannerProps) {
  const { data: intent } = useTravelIntent();
  const upsert = useUpsertTravelIntent();
  const patchStatus = usePatchTravelIntentStatus();
  const [open, setOpen] = useState(false);
  const [destinationScope, setDestinationScope] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetFlex, setBudgetFlex] = useState<'flexible' | 'moderate' | 'strict'>('flexible');
  const [openToCarpool, setOpenToCarpool] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const active = intent?.active ?? false;
  const hasSavedIntent = Boolean(
    intent?.destinationScope && intent?.startDate && intent?.endDate
  );
  const busy = upsert.isPending || patchStatus.isPending;
  const today = format(new Date(), 'yyyy-MM-dd');

  const openDialog = () => {
    setDestinationScope(intent?.destinationScope ?? intent?.destinationHint ?? '');
    setStartDate(intent?.startDate ?? '');
    setEndDate(intent?.endDate ?? '');
    setBudgetFlex(intent?.budgetFlex ?? intent?.budgetFlexibility ?? 'flexible');
    setOpenToCarpool(intent?.openToCarpool ?? false);
    setFormError(null);
    setOpen(true);
  };

  const validateForm = (): boolean => {
    if (!destinationScope.trim()) {
      setFormError('请填写想去的目的地');
      return false;
    }
    if (!startDate || !endDate) {
      setFormError('请选择出发与结束日期');
      return false;
    }
    if (endDate < startDate) {
      setFormError('结束日期不能早于出发日期');
      return false;
    }
    setFormError(null);
    return true;
  };

  const saveFields = async () => {
    if (!validateForm()) {
      throw new Error('VALIDATION');
    }
    await upsert.mutateAsync({
      destinationScope: destinationScope.trim(),
      startDate,
      endDate,
      budgetFlex,
      openToCarpool,
      note: '可被队长雷达发现',
    });
  };

  const handleError = (error: unknown) => {
    if (error instanceof Error && error.message === 'VALIDATION') return;
    const message =
      error instanceof MatchSquareApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : '保存失败';
    toast.error(message);
  };

  const handleEnable = async () => {
    try {
      await saveFields();
      await patchStatus.mutateAsync({ status: 'active' });
      toast.success('旅行意向已广播');
      setOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleUpdate = async () => {
    try {
      await saveFields();
      toast.success('意向已更新');
      setOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDisable = async () => {
    try {
      await patchStatus.mutateAsync({ status: 'paused' });
      toast.success('已关闭意向广播');
      setOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const summaryDate = intent ? intentDateLabel(intent) : undefined;
  const summaryLine =
    active || hasSavedIntent
      ? [summaryDate, intent?.destinationScope ?? intent?.destinationHint].filter(Boolean).join(' · ')
      : null;

  const statusLabel = active
    ? '广播中'
    : hasSavedIntent
      ? '未广播'
      : '挂起意向';

  const dialogButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={active || hasSavedIntent ? 'ghost' : 'default'}
          className={cn(
            compact && 'h-6 shrink-0 px-2 text-[10px] font-normal text-muted-foreground hover:text-foreground',
            compact && (active || hasSavedIntent) && 'text-foreground/80'
          )}
          onClick={openDialog}
        >
          <Compass className={cn('shrink-0', compact ? 'mr-1 h-3 w-3' : 'mr-1.5 h-3.5 w-3.5')} />
          {active ? '调整' : hasSavedIntent ? '继续广播' : '挂起意向'}
        </Button>
      </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>个人旅行意向</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="intent-dest">想去哪里</Label>
              <Input
                id="intent-dest"
                placeholder="如 西北、新疆、青甘环线"
                value={destinationScope}
                onChange={(e) => {
                  setDestinationScope(e.target.value);
                  setFormError(null);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="intent-start">最早出发</Label>
                <Input
                  id="intent-start"
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setFormError(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent-end">最晚结束</Label>
                <Input
                  id="intent-end"
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setFormError(null);
                  }}
                />
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="space-y-2">
              <Label>预算弹性</Label>
              <Select
                value={budgetFlex}
                onValueChange={(v) => setBudgetFlex(v as 'flexible' | 'moderate' | 'strict')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">可高可低</SelectItem>
                  <SelectItem value="moderate">适中</SelectItem>
                  <SelectItem value="strict">严格控预算</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={openToCarpool}
                onChange={(e) => setOpenToCarpool(e.target.checked)}
                className="rounded border-border"
              />
              愿意拼车 / 搭车
            </label>
            <p className={cn(plazaBadge.tag, 'inline-flex text-muted-foreground')}>
              开启后，发布中招募的队长可在雷达中看到你（不公开联系方式）
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {active && (
              <Button variant="ghost" onClick={handleDisable} disabled={busy}>
                关闭广播
              </Button>
            )}
            <Button onClick={active ? handleUpdate : handleEnable} disabled={busy}>
              {active ? '保存调整' : '开启广播'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );

  if (compact) {
    return (
      <div
        className={cn('flex min-w-0 items-center gap-1.5 text-xs', className)}
        role="status"
        aria-label="旅行意向"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            plazaGateStatusDot(active, hasSavedIntent && !active)
          )}
          aria-hidden
        />
        <span
          className={cn(
            'shrink-0 tabular-nums',
            active ? 'text-[var(--gate-allow-foreground)]' : 'text-muted-foreground'
          )}
        >
          {statusLabel}
        </span>
        {summaryLine && (
          <span className="max-w-[8.5rem] truncate text-foreground/80 sm:max-w-[10rem]">
            {summaryLine}
          </span>
        )}
        {dialogButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            plazaGateStatusDot(active, hasSavedIntent && !active)
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {active
              ? '旅行意向广播中'
              : hasSavedIntent
                ? '意向已保存 · 未开启广播'
                : '挂起旅行意向，等队长来捞你'}
          </p>
          {summaryLine ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{summaryLine}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              不发招募帖也能被高契合队长发现 · 匹配度 ≥85% 可收橄榄枝
            </p>
          )}
        </div>
      </div>
      {dialogButton}
    </div>
  );
}
