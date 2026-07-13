import { BedDouble, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ArrangeLodgingNightStatus } from '@/lib/arrange-itinerary-lodging-coverage.util';
import { workbenchPanelTitle } from '../workbench-ui';

export interface ArrangeItineraryAddLodgingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  night: ArrangeLodgingNightStatus | null;
  onOpenHotelSearch?: () => void;
  onAskNara?: () => void;
  onFillAllWithNara?: () => void;
  missingLodgingNights?: number;
  className?: string;
}

export function ArrangeItineraryAddLodgingSheet({
  open,
  onOpenChange,
  night,
  onOpenHotelSearch,
  onAskNara,
  onFillAllWithNara,
  missingLodgingNights = 0,
  className,
}: ArrangeItineraryAddLodgingSheetProps) {
  const dayLabel = night
    ? `Day ${night.dayNumber} · ${night.dateLabel} ${night.weekdayLabel}`.trim()
    : '当晚';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-md', className)}>
        <SheetHeader className="border-b border-border/50 px-4 py-4 text-left">
          <SheetTitle className={workbenchPanelTitle}>添加当晚住宿</SheetTitle>
          <SheetDescription className="text-xs">
            {dayLabel} — 选择搜索酒店或让 Nara 按路线推荐
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="search" className="text-xs">
                搜索酒店
              </TabsTrigger>
              <TabsTrigger value="nara" className="text-xs">
                Nara 推荐
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-3">
              <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">从地点库搜索</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  按名称查找酒店、民宿或营地，确认入住时间后加入当晚行程。
                </p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  onOpenHotelSearch?.();
                }}
              >
                <BedDouble className="mr-2 h-4 w-4" />
                搜索并添加住宿
              </Button>
            </TabsContent>

            <TabsContent value="nara" className="mt-4 space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-foreground">智能推荐</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Nara 会结合当天已排景点与次日出发路线，推荐合适的当晚住宿，并在助手侧栏展示「加入行程」卡片。
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                className="w-full"
                onClick={() => {
                  onAskNara?.();
                  onOpenChange(false);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                为 {night ? `Day ${night.dayNumber}` : '当晚'} 推荐住宿
              </Button>
              {missingLodgingNights > 1 && onFillAllWithNara ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    onFillAllWithNara();
                    onOpenChange(false);
                  }}
                >
                  一次性补齐全部 {missingLodgingNights} 晚
                </Button>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
