import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AlertTriangle } from 'lucide-react';
import {
  ConstraintConsoleWorkbench,
  type ConstraintConsoleWorkbenchHandle,
} from './ConstraintConsoleWorkbench';
import type { ConstraintConsoleWorkbenchProps } from './ConstraintConsoleWorkbench';
import { ConstraintDrawerHeader } from './ConstraintDrawerHeader';

export interface ConstraintConsoleDrawerProps
  extends Omit<ConstraintConsoleWorkbenchProps, 'variant' | 'showTopBackBar' | 'onBack' | 'className' | 'deferSessionSave'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusTitle?: string | null;
  drawerSubtitle?: string | null;
  /** 小屏抽屉顶栏 · 关联当日冲突摘要 */
  scheduleConflictHint?: string | null;
  editSessionSaveCount?: number;
  editSessionEvalPending?: boolean;
  editSessionPendingCount?: number;
  sessionCommitting?: boolean;
  onCommitConstraintEval?: () => void;
}

/** 旅行条件 · 右侧编辑抽屉（保留工作台行程上下文） */
export const ConstraintConsoleDrawer = forwardRef<
  ConstraintConsoleWorkbenchHandle,
  ConstraintConsoleDrawerProps
>(function ConstraintConsoleDrawer(
  {
    open,
    onOpenChange,
    focusTitle,
    drawerSubtitle,
    scheduleConflictHint,
    editSessionSaveCount = 0,
    editSessionEvalPending = false,
    editSessionPendingCount = 0,
    sessionCommitting = false,
    onCommitConstraintEval,
    ...workbenchProps
  }: ConstraintConsoleDrawerProps,
  ref,
) {
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  useEffect(() => {
    if (open) setHasBeenOpened(true);
  }, [open]);

  const sheetTitle = focusTitle?.trim()
    ? `编辑：${focusTitle.trim()}`
    : '旅行条件';

  const subtitle =
    drawerSubtitle?.trim() ||
    (editSessionPendingCount > 0 ? '编辑草稿' : '查看与调整旅行条件');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,840px)] lg:max-w-[min(94vw,1040px)] xl:max-w-[min(92vw,1180px)] 2xl:max-w-[1280px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>在当前行程上下文下编辑旅行条件</SheetDescription>
        </SheetHeader>
        {onCommitConstraintEval ? (
          <ConstraintDrawerHeader
            title="旅行条件"
            subtitle={subtitle}
            pendingCount={editSessionPendingCount}
            saveCount={editSessionSaveCount}
            evalPending={editSessionEvalPending}
            saving={sessionCommitting}
            onCommit={onCommitConstraintEval}
          />
        ) : null}
        {scheduleConflictHint?.trim() ? (
          <div className="flex shrink-0 items-start gap-2 border-b border-border/60 bg-muted/20 px-4 py-2 xl:hidden">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-[11px] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">关联问题 · </span>
              {scheduleConflictHint.trim()}
            </p>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {hasBeenOpened ? (
            <ConstraintConsoleWorkbench
              ref={ref}
              {...workbenchProps}
              deferSessionSave
              variant="drawer"
              showTopBackBar={false}
              onBack={() => onOpenChange(false)}
              className={cn('min-h-0 flex-1', !open && 'hidden')}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
});
