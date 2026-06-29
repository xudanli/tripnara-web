import { List, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { journeyMapMobileFab, journeyMapMobileFabActive } from '../journey-map-ui';

export interface FullJourneyMapMobileChromeProps {
  leftOpen: boolean;
  rightOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  onRightOpenChange: (open: boolean) => void;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  hasSelection: boolean;
  className?: string;
}

/** 移动端：浮动按钮 + Sheet 侧栏（拇指热区 h-11） */
export function FullJourneyMapMobileChrome({
  leftOpen,
  rightOpen,
  onLeftOpenChange,
  onRightOpenChange,
  leftPanel,
  rightPanel,
  hasSelection,
  className,
}: FullJourneyMapMobileChromeProps) {
  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden',
          className,
        )}
      >
        <Button
          type="button"
          variant="secondary"
          className={journeyMapMobileFab}
          onClick={() => onLeftOpenChange(true)}
          aria-expanded={leftOpen}
        >
          <List className="h-4 w-4" aria-hidden />
          行程
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(hasSelection && journeyMapMobileFabActive, !hasSelection && journeyMapMobileFab)}
          onClick={() => onRightOpenChange(true)}
          aria-expanded={rightOpen}
          aria-label={hasSelection ? '查看选中项详情' : '打开详情面板'}
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          详情
        </Button>
      </div>

      <Sheet open={leftOpen} onOpenChange={onLeftOpenChange}>
        <SheetContent side="left" className="w-[min(100vw-2rem,320px)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>行程与筛选</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">{leftPanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={rightOpen} onOpenChange={onRightOpenChange}>
        <SheetContent side="right" className="w-[min(100vw-2rem,360px)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>活动 Inspector</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">{rightPanel}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
