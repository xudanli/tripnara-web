import { cn } from '@/lib/utils';
import { CTRE_PROGRESS_HINTS } from '../constants';

export type CtreCompileProgressAwaitingHintProps = {
  /** 无 trip_id：仅 SSE / RESULT */
  sseOnly?: boolean;
  /** 有 trip_id 但 Graph 尚未落库 */
  graphPending?: boolean;
  /** Compiler 未启用 */
  compilerDisabled?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * 生成中 CTRE 面板暂无数据时的说明（404/空为正常，勿当错误）。
 */
export function CtreCompileProgressAwaitingHint({
  sseOnly = false,
  graphPending = false,
  compilerDisabled = false,
  compact = true,
  className,
}: CtreCompileProgressAwaitingHintProps) {
  const message = compilerDisabled
    ? CTRE_PROGRESS_HINTS.compilerDisabled
    : sseOnly
      ? CTRE_PROGRESS_HINTS.sseOnlyDraft
      : CTRE_PROGRESS_HINTS.graphPending;

  return (
    <p
      className={cn(
        'text-muted-foreground leading-relaxed',
        compact ? 'text-[10px]' : 'text-xs',
        className,
      )}
      role="note"
    >
      {message}
    </p>
  );
}
