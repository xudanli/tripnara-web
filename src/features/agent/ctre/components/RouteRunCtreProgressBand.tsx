import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { CtreCompileProgressPanelMaybe } from './CtreCompileProgressPanel';

export type RouteRunCtreProgressBandProps = {
  compact?: boolean;
  className?: string;
  /** 覆盖编排总进度；默认读 planningTaskStore.progressPercentage */
  orchestrationPercent?: number;
};

/**
 * route_and_run 异步进度中的 CTRE 细粒度面板。
 *
 * 数据来源：SSE `ctre_compilation` → RESULT metadata（无 trip_id 时仅此两路）
 * 不轮询 Trip Graph API。
 */
export function RouteRunCtreProgressBand({
  compact,
  className,
  orchestrationPercent,
}: RouteRunCtreProgressBandProps) {
  const ctreCompilation = usePlanningTaskStore((s) => s.ctreCompilation);
  const storePercent = usePlanningTaskStore((s) => s.progressPercentage);

  return (
    <CtreCompileProgressPanelMaybe
      progress={ctreCompilation}
      orchestrationPercent={orchestrationPercent ?? storePercent}
      compact={compact}
      className={className}
    />
  );
}
