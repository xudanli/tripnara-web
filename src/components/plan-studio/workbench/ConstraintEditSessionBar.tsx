import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { workbenchPrimaryAction } from './workbench-ui';

export interface ConstraintEditSessionBarProps {
  /** 待保存的编辑项数（尚未写入服务端） */
  pendingCount?: number;
  saveCount: number;
  evalPending: boolean;
  onCommitEval: () => void;
  saving?: boolean;
  className?: string;
  compact?: boolean;
}

/** 规划工作台 · 约束编辑会话条（日程 Tab 顶栏下） */
export function ConstraintEditSessionBar({
  pendingCount = 0,
  saveCount,
  evalPending,
  onCommitEval,
  saving = false,
  className,
  compact = false,
}: ConstraintEditSessionBarProps) {
  const hasPendingSave = pendingCount > 0;
  const showBar = hasPendingSave || saveCount > 0 || evalPending;
  if (!showBar) return null;

  const ctaLabel = hasPendingSave ? '保存并检查是否走得通' : '完成检查';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 border-b border-gate-suggest-border/40 bg-gate-suggest/8 px-3 py-2',
        compact && 'px-2.5 py-1.5',
        className,
      )}
      role="status"
    >
      <p className={cn('min-w-0 text-muted-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
        <span className="font-medium text-foreground">
          {hasPendingSave ? '正在编辑旅行条件' : '旅行条件已更新'}
        </span>
        {hasPendingSave ? (
          <span>
            {' '}
            · {pendingCount} 项待保存
          </span>
        ) : saveCount > 0 ? (
          <span>
            {' '}
            · 已保存 {saveCount} 项
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {' '}
          · {hasPendingSave ? '保存后将重新检查是否走得通' : '检查结果待刷新'}
        </span>
      </p>
      <Button
        type="button"
        size="sm"
        className={cn(
          'h-7 shrink-0 text-[11px]',
          compact && 'h-6 px-2 text-[10px]',
          workbenchPrimaryAction,
        )}
        disabled={saving}
        onClick={onCommitEval}
      >
        {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
        {ctaLabel}
      </Button>
    </div>
  );
}
