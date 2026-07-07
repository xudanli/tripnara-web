import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CtreCompileProgressPanel } from './CtreCompileProgressPanel';
import { useCtreCompileProgress } from '../hooks/useCtreCompileProgress';
import type { CtreCompileProgressView } from '../types';

export type CtreCompileProgressCardContentProps = {
  progress: CtreCompileProgressView | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
};

export function CtreCompileProgressCardContent({
  progress,
  loading,
  error,
  onReload,
  className,
  compact = false,
  showHeader = true,
}: CtreCompileProgressCardContentProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
            CTRE 行程结构化
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground"
            disabled={loading}
            onClick={() => void onReload()}
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground"
            disabled={loading}
            onClick={() => void onReload()}
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      )}
      {error && !progress ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : null}
      {progress ? (
        <CtreCompileProgressPanel progress={progress} compact={compact} defaultPhasesExpanded={false} />
      ) : loading ? (
        <p className="text-xs text-muted-foreground">加载编译进度…</p>
      ) : null}
    </div>
  );
}

export type TripCtreCompileProgressCardProps = {
  tripId: string;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
};

/**
 * Trip 详情离线查看最近一次 CTRE 编译进度（Graph 已持久化后）。
 * 无数据时不渲染（Compiler 未跑过或 Graph 未写入）。
 */
export function TripCtreCompileProgressCard({
  tripId,
  className,
  compact = false,
  showHeader = true,
}: TripCtreCompileProgressCardProps) {
  const query = useCtreCompileProgress(tripId);

  if (!query.loading && !query.progress && !query.error) {
    return null;
  }

  return (
    <CtreCompileProgressCardContent
      {...query}
      onReload={query.reload}
      className={className}
      compact={compact}
      showHeader={showHeader}
    />
  );
}

/** 供父级已持有 query 时复用，避免重复请求 */
export type TripCtreCompileProgressCardBoundProps = TripCtreCompileProgressCardProps &
  Pick<CtreCompileProgressCardContentProps, 'progress' | 'loading' | 'error' | 'onReload'>;

export function TripCtreCompileProgressCardBound({
  progress,
  loading,
  error,
  onReload,
  className,
  compact = false,
  showHeader = true,
}: TripCtreCompileProgressCardBoundProps) {
  return (
    <CtreCompileProgressCardContent
      progress={progress}
      loading={loading}
      error={error}
      onReload={onReload}
      className={className}
      compact={compact}
      showHeader={showHeader}
    />
  );
}
