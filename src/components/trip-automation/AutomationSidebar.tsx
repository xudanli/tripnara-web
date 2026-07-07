import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  History,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import AutomationConfirmMembers from '@/components/trip-automation/AutomationConfirmMembers';
import type { TeamGovernanceRule } from '@/api/automation-authorization.types';
import type {
  AutomationBoundaryItem,
  AutomationRecentLogItem,
} from '@/lib/trip-automation-authorization.util';
import type { AutomationConfirmMember } from '@/lib/trip-automation-context.util';
import {
  tripAutomationQuickActionBtn,
  tripAutomationSidebarCard,
} from './trip-automation-ui';

interface AutomationSidebarProps {
  boundaries: AutomationBoundaryItem[];
  recentLogs: AutomationRecentLogItem[];
  confirmMembers?: AutomationConfirmMember[];
  governanceRules?: TeamGovernanceRule[];
  isContextSnapshotRefreshing?: boolean;
  onRefreshContextSnapshot?: () => void;
  paused?: boolean;
  onEditBoundaries?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onUndo?: (logId: string) => void;
  undoingLogId?: string | null;
  isPausing?: boolean;
  onViewDecisionHistory?: () => void;
  onTemporaryBoost?: () => void;
  className?: string;
}

export default function AutomationSidebar({
  boundaries,
  recentLogs,
  confirmMembers = [],
  governanceRules = [],
  isContextSnapshotRefreshing,
  onRefreshContextSnapshot,
  paused = false,
  onEditBoundaries,
  onPause,
  onResume,
  onUndo,
  undoingLogId,
  isPausing,
  onViewDecisionHistory,
  onTemporaryBoost,
  className,
}: AutomationSidebarProps) {
  return (
    <aside className={cn('space-y-4', className)}>
      {paused ? (
        <div className="rounded-xl border border-gate-confirm-border/45 bg-gate-confirm/8 px-3 py-2.5 text-xs text-gate-confirm-foreground">
          自动执行已暂停 · 监控与提醒仍会继续
        </div>
      ) : null}

      <AutomationConfirmMembers
        members={confirmMembers}
        rules={governanceRules}
        isRefreshing={isContextSnapshotRefreshing}
        onRefresh={onRefreshContextSnapshot}
      />

      <section className={tripAutomationSidebarCard}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">执行边界与条件</h3>
          {onEditBoundaries ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEditBoundaries}>
              编辑
            </Button>
          ) : null}
        </div>
        <ul className="mt-3 space-y-2.5">
          {boundaries.map((item) => (
            <li key={item.label} className="text-xs leading-relaxed">
              <span className="text-muted-foreground">{item.label}</span>
              <p className="mt-0.5 font-medium text-foreground">{item.value}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={tripAutomationSidebarCard}>
        <h3 className="text-sm font-semibold text-foreground">最近自动执行记录</h3>
        {recentLogs.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">暂无自动执行记录</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {recentLogs.map((log) => (
              <li key={log.id} className="border-l-2 border-border/60 pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{log.title}</p>
                  {log.autoExecuted ? (
                    <span className="rounded-full border border-gate-allow-border/55 bg-gate-allow/10 px-1.5 py-0.5 text-[10px] font-semibold text-gate-allow-foreground">
                      已自动执行
                    </span>
                  ) : null}
                </div>
                {log.detail ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{log.detail}</p>
                ) : null}
                {log.occurredAt ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(log.occurredAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </p>
                ) : null}
                {log.undoEnabled && onUndo && log.undoLogId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 h-7 px-2 text-[10px]"
                    disabled={undoingLogId === log.undoLogId}
                    onClick={() => onUndo(log.undoLogId!)}
                  >
                    {undoingLogId === log.undoLogId ? (
                      <Spinner className="mr-1 h-3 w-3" />
                    ) : (
                      <RotateCcw className="mr-1 h-3 w-3" />
                    )}
                    撤销
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={tripAutomationSidebarCard}>
        <h3 className="text-sm font-semibold text-foreground">快速操作</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={tripAutomationQuickActionBtn}
            disabled={isPausing}
            onClick={() => (paused ? onResume?.() : onPause?.())}
          >
            {isPausing ? (
              <Spinner className="h-4 w-4" />
            ) : paused ? (
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            ) : (
              <PauseCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-[11px] font-medium text-foreground">
              {paused ? '恢复自动执行' : '暂停自动执行'}
            </span>
          </button>
          <button type="button" className={tripAutomationQuickActionBtn} onClick={onTemporaryBoost}>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">临时提高自治</span>
          </button>
          <button
            type="button"
            className={tripAutomationQuickActionBtn}
            onClick={onViewDecisionHistory}
          >
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">查看决策历史</span>
          </button>
          <button
            type="button"
            className={tripAutomationQuickActionBtn}
            disabled={!recentLogs.some((log) => log.undoEnabled)}
            onClick={() => {
              const target = recentLogs.find((log) => log.undoEnabled && log.undoLogId);
              if (target?.undoLogId) onUndo?.(target.undoLogId);
            }}
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">撤销上次操作</span>
          </button>
        </div>
      </section>

      <p className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-muted-foreground">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        所有自动执行均写入活动记录，你可与团队随时审计与回放。
      </p>
    </aside>
  );
}
