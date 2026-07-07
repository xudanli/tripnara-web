import { useWorkbenchCtreTaskStore } from '@/store/workbenchCtreTaskStore';
import { CtreCompileProgressAwaitingHint } from './CtreCompileProgressAwaitingHint';
import { WorkbenchCtrePanel } from './WorkbenchCtrePanel';
import { useCtreCompileProgress } from '../hooks/useCtreCompileProgress';
import { isTravelCompilerEnabledByEnv } from '../constants';
import { shouldShowWorkbenchVerifyRepairPanel } from '../workbench-helpers';

export type WorkbenchCtreProgressBandProps = {
  tripId: string | null | undefined;
  /** 工作台 / Plan Gate 生成中为 true */
  active?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Planning Workbench CTRE + VERIFY⇄REPAIR 面板（仅 Workbench execute async）。
 * 主数据：`GET …/tasks/:taskId/status` → `ctre` / `result.uiOutput.ctre`。
 * 勿期望 route_and_run SSE 的 `kernelVerifyRepairLoop`。
 */
export function WorkbenchCtreProgressBand({
  tripId,
  active = false,
  compact = true,
  className,
}: WorkbenchCtreProgressBandProps) {
  const workbenchCtre = useWorkbenchCtreTaskStore((s) => s.ctre);
  const currentStage = useWorkbenchCtreTaskStore((s) => s.currentStage);
  const hasTripId = Boolean(tripId?.trim());
  const compilerEnabled = isTravelCompilerEnabledByEnv();

  const { progress: graphProgress, graphNotFound } = useCtreCompileProgress(tripId, {
    purpose: 'poll-fallback',
    pollWhile: active && hasTripId && !workbenchCtre?.progress,
    enabled: active && hasTripId && !workbenchCtre?.progress,
    pollIntervalMs: 2000,
  });

  const showWorkbenchPanel =
    shouldShowWorkbenchVerifyRepairPanel(workbenchCtre) ||
    (active && Boolean(currentStage?.trim()));

  const showGraphFallback =
    !workbenchCtre?.progress && graphProgress && active && hasTripId;

  const showAwaitingHint =
    active &&
    !showWorkbenchPanel &&
    !showGraphFallback &&
    compilerEnabled;

  if (!active && !workbenchCtre && !showGraphFallback) return null;

  return (
    <div className={className}>
      {showWorkbenchPanel ? (
        <WorkbenchCtrePanel
          ctre={workbenchCtre}
          currentStage={currentStage}
          active={active}
          compact={compact}
        />
      ) : null}

      {showGraphFallback ? (
        <WorkbenchCtrePanel
          ctre={{ progress: graphProgress ?? undefined }}
          active={active}
          compact={compact}
        />
      ) : null}

      {showAwaitingHint ? (
        <CtreCompileProgressAwaitingHint
          compilerDisabled={!compilerEnabled}
          sseOnly={!hasTripId}
          graphPending={hasTripId && graphNotFound}
          compact={compact}
        />
      ) : null}
    </div>
  );
}
