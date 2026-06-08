import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatZhDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return `${y}年${mo}月${d}日`;
}

function formatZhDateRange(startIso: string, endIso: string): string {
  return `${formatZhDate(startIso)} 至 ${formatZhDate(endIso)}`;
}

export interface HotelSearchPreflightCardProps {
  startDateIso: string;
  endDateIso: string;
  destination?: string;
  disabled?: boolean;
  className?: string;
  onConfirmItinerary: () => void;
  onSearchCustomDates: (checkIn: string, checkOut: string) => void;
}

export function HotelSearchPreflightCard({
  startDateIso,
  endDateIso,
  destination,
  disabled,
  className,
  onConfirmItinerary,
  onSearchCustomDates,
}: HotelSearchPreflightCardProps) {
  const [checkIn, setCheckIn] = useState(startDateIso);
  const [checkOut, setCheckOut] = useState(endDateIso);

  useEffect(() => {
    setCheckIn(startDateIso);
    setCheckOut(endDateIso);
  }, [startDateIso, endDateIso]);

  const rangeText = formatZhDateRange(startDateIso, endDateIso);

  const handleCustomSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error('请选择入住与退房日期');
      return;
    }
    if (checkOut <= checkIn) {
      toast.error('退房日期须晚于入住日期');
      return;
    }
    onSearchCustomDates(checkIn, checkOut);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-left shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">请补充信息</p>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            您的行程是 {rangeText}
            {destination?.trim() ? `（${destination.trim()}）` : ''}
            ，是否用这几天查酒店？回复「好的」或「可以」确认，或直接说其他日期。
          </p>
        </div>
      </div>

      <Button
        type="button"
        className="w-full mb-4 bg-orange-500 hover:bg-orange-600 text-white gap-2"
        disabled={disabled}
        onClick={onConfirmItinerary}
      >
        <Calendar className="w-4 h-4" />
        确认使用行程日期并搜索
      </Button>

      <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mb-2">或选择其他日期：</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1 min-w-0">
          <Label htmlFor="hotel-preflight-checkin" className="text-[11px] text-amber-900/80">
            入住
          </Label>
          <Input
            id="hotel-preflight-checkin"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            disabled={disabled}
            className="h-9 text-xs bg-white/90 dark:bg-background"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <Label htmlFor="hotel-preflight-checkout" className="text-[11px] text-amber-900/80">
            退房
          </Label>
          <Input
            id="hotel-preflight-checkout"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            disabled={disabled}
            className="h-9 text-xs bg-white/90 dark:bg-background"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-amber-300 bg-white/80 dark:bg-background gap-2 text-foreground"
        disabled={disabled}
        onClick={handleCustomSearch}
      >
        <Calendar className="w-4 h-4" />
        使用以上日期搜索
      </Button>
    </div>
  );
}
