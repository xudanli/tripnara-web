import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { workbenchPrimaryAction } from './workbench-ui';

export interface ConstraintDrawerHeaderProps {
  title?: string;
  subtitle?: string | null;
  pendingCount?: number;
  saveCount?: number;
  evalPending?: boolean;
  saving?: boolean;
  onCommit: () => void;
  className?: string;
}

function buildSessionStatus(pendingCount: number, saveCount: number, evalPending: boolean): string | null {
  const hasPending = pendingCount > 0;
  if (hasPending) {
    return `草稿中 · ${pendingCount} 项待保存 · 保存后将重新检查是否走得通`;
  }
  if (saveCount > 0 || evalPending) {
    return `已更新 ${saveCount > 0 ? saveCount : 1} 项 · 检查结果尚未刷新`;
  }
  return null;
}

function primaryLabel(pendingCount: number, saveCount: number, evalPending: boolean): string {
  if (pendingCount > 0) return '保存并检查是否走得通';
  if (saveCount > 0 || evalPending) return '完成检查';
  return '保存并检查是否走得通';
}

/** 旅行条件抽屉 · 顶栏（唯一紫色主 CTA） */
export function ConstraintDrawerHeader({
  title = '旅行条件',
  subtitle,
  pendingCount = 0,
  saveCount = 0,
  evalPending = false,
  saving = false,
  onCommit,
  className,
}: ConstraintDrawerHeaderProps) {
  const hasPending = pendingCount > 0;
  const showPrimary = hasPending || saveCount > 0 || evalPending;
  const statusText = buildSessionStatus(pendingCount, saveCount, evalPending);

  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-background px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {statusText ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-gate-suggest-border/40 bg-gate-suggest/8 px-2 py-0.5 text-[10px] font-normal leading-snug text-muted-foreground">
              {statusText}
            </span>
          ) : null}
        </div>
        {subtitle?.trim() ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle.trim()}</p>
        ) : null}
      </div>
      {showPrimary ? (
        <Button
          type="button"
          size="sm"
          className={cn('h-8 shrink-0 px-3 text-xs', workbenchPrimaryAction)}
          disabled={saving}
          onClick={onCommit}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {primaryLabel(pendingCount, saveCount, evalPending)}
        </Button>
      ) : null}
    </div>
  );
}

export interface ConstraintDrawerFooterProps {
  pendingCount?: number;
  saving?: boolean;
  onCommit: () => void;
  className?: string;
}

/** 旅行条件抽屉 · 底栏（草稿态 sticky 重复主 CTA） */
export function ConstraintDrawerFooter({
  pendingCount = 0,
  saving = false,
  onCommit,
  className,
}: ConstraintDrawerFooterProps) {
  if (pendingCount <= 0) return null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-sm',
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{pendingCount} 项待保存</span>
        {' · '}
        尚未写入正式条件
      </p>
      <Button
        type="button"
        size="sm"
        className={cn('h-8 shrink-0 px-3 text-xs', workbenchPrimaryAction)}
        disabled={saving}
        onClick={onCommit}
      >
        {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
        保存并检查是否走得通
      </Button>
    </div>
  );
}
