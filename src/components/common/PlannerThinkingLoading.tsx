import { PlannerThinkingIllustration } from '@/components/illustrations';
import { cn } from '@/lib/utils';

export interface PlannerThinkingLoadingProps {
  /** 主文案，默认「规划师正在思考...」 */
  label?: string;
  /** 0–100，异步 route_and_run 轮询进度 */
  progress?: number;
  /** STALE / RESUMING 等无确定进度时展示 indeterminate 条 */
  indeterminate?: boolean;
  size?: number;
  className?: string;
  textClassName?: string;
  strokeColor?: string;
  highlightColor?: string;
  /**
   * 紧凑布局：去掉 NL 聊天 TypingIndicator 的 px-4 py-3，用于气泡内、页眉、卡片行内。
   */
  compact?: boolean;
}

const DEFAULT_LABEL = '规划师正在思考...';

/**
 * 统一「规划师思考」加载态：地图路线插画 + 文案。
 * 动画依赖全局样式：globals.css 中 `.planner-route-draw` / `.planner-dot-pulse`。
 */
export function PlannerThinkingLoading({
  label = DEFAULT_LABEL,
  progress,
  indeterminate,
  size = 40,
  className,
  textClassName = 'text-sm text-muted-foreground',
  strokeColor = '#6B7280',
  highlightColor,
  compact = false,
}: PlannerThinkingLoadingProps) {
  const progressClamped =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : undefined;

  return (
    <div
      className={cn('flex flex-col gap-2', !compact && 'px-4 py-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...(progressClamped !== undefined
        ? { 'aria-valuenow': Math.round(progressClamped), 'aria-valuemin': 0, 'aria-valuemax': 100 }
        : {})}
    >
      <div className="flex items-center gap-3">
        <PlannerThinkingIllustration
          size={size}
          strokeColor={strokeColor}
          {...(highlightColor !== undefined ? { highlightColor } : {})}
        />
        <span className={cn(textClassName)}>{label}</span>
      </div>
      {progressClamped !== undefined ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-500 ease-out"
            style={{ width: `${progressClamped}%` }}
          />
        </div>
      ) : indeterminate ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full w-1/3 rounded-full bg-primary/70 animate-pulse" />
        </div>
      ) : null}
    </div>
  );
}
