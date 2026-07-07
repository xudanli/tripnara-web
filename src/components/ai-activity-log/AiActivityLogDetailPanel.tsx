import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Shield, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { AiActivityLogDetailResponse } from '@/api/ai-activity-log.types';
import {
  aiActivityLogStatusTone,
  formatAiActivityLogTime,
  resolveAiActivityLogHref,
} from '@/lib/ai-activity-log-display.util';
import {
  aiActivityLogDetailCard,
  aiActivityLogStatusBadgeClass,
} from './ai-activity-log-ui';

interface AiActivityLogDetailPanelProps {
  detail?: AiActivityLogDetailResponse | null;
  isLoading?: boolean;
  isUndoing?: boolean;
  onNavigateHref?: (href: string) => void;
  onUndo?: (logId: string) => void;
  className?: string;
}

export default function AiActivityLogDetailPanel({
  detail,
  isLoading,
  isUndoing,
  onNavigateHref,
  onUndo,
  className,
}: AiActivityLogDetailPanelProps) {
  if (isLoading) {
    return (
      <aside className={cn(aiActivityLogDetailCard, 'items-center justify-center', className)}>
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </aside>
    );
  }

  if (!detail) {
    return (
      <aside className={cn(aiActivityLogDetailCard, className)}>
        <p className="text-sm text-muted-foreground">选择一条活动记录查看详情</p>
      </aside>
    );
  }

  const tone = aiActivityLogStatusTone(detail.statusTag);
  const undoLogId = detail.undo?.logId ?? detail.activityId;
  const canUndo = detail.undo?.enabled === true && Boolean(undoLogId);
  const feasibility = detail.impactMetrics?.feasibilityScore;
  const risk = detail.impactMetrics?.riskLevel;

  return (
    <aside className={cn(aiActivityLogDetailCard, className)}>
      <div className="flex items-start gap-3 border-b border-border/50 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/45 bg-muted/15">
          <Shield className="h-5 w-5 text-gate-allow-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{detail.title}</h2>
            {detail.statusLabel ? (
              <span className={aiActivityLogStatusBadgeClass(tone)}>{detail.statusLabel}</span>
            ) : null}
          </div>
          {detail.eventId ? (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{detail.eventId}</p>
          ) : null}
          {detail.occurredAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatAiActivityLogTime(detail.occurredAt)}
            </p>
          ) : null}
        </div>
      </div>

      {detail.executionReason ? (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-foreground">执行原因</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {detail.executionReason}
          </p>
        </section>
      ) : null}

      {detail.evidence?.length ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">使用依据</h3>
            {detail.actions?.viewEvidence?.enabled ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-[11px]"
                onClick={() => {
                  const href = resolveAiActivityLogHref(detail.actions?.viewEvidence?.href);
                  if (href && onNavigateHref) onNavigateHref(href);
                }}
              >
                查看依据
              </Button>
            ) : null}
          </div>
          <ul className="mt-2 space-y-2">
            {detail.evidence.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-border/50 bg-muted/8 px-3 py-2.5 text-xs"
              >
                <p className="font-medium text-foreground">{item.label}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-muted-foreground">{item.detail}</p>
                ) : null}
                {item.updatedAt ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    更新于{' '}
                    {format(new Date(item.updatedAt), 'HH:mm', { locale: zhCN })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {feasibility || risk ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">修改前后</h3>
            {detail.actions?.viewDiff?.enabled ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-[11px]"
                onClick={() => {
                  const href = resolveAiActivityLogHref(detail.actions?.viewDiff?.href);
                  if (href && onNavigateHref) onNavigateHref(href);
                }}
              >
                查看差异
              </Button>
            ) : null}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <MetricBox
              label="修改前"
              feasibility={feasibility?.before}
              risk={risk?.before}
            />
            <MetricBox
              label="修改后"
              feasibility={feasibility?.after}
              risk={risk?.after}
              highlight
            />
          </div>
        </section>
      ) : null}

      {detail.confirmedBy?.displayName ? (
        <section className="mt-4 rounded-xl border border-border/50 bg-muted/8 px-3 py-3">
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-foreground">确认人</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {detail.confirmedBy.displayName}
                {detail.confirmedBy.occurredAt
                  ? ` · ${formatAiActivityLogTime(detail.confirmedBy.occurredAt)}`
                  : ''}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {canUndo ? (
        <div className="mt-auto border-t border-border/50 pt-4">
          <p className="text-[11px] text-muted-foreground">
            此操作可撤销，将恢复至修改前的行程版本。
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3 h-8"
            disabled={isUndoing}
            onClick={() => onUndo?.(undoLogId!)}
          >
            {isUndoing ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
            撤销此操作
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function MetricBox({
  label,
  feasibility,
  risk,
  highlight,
}: {
  label: string;
  feasibility?: number;
  risk?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-xs',
        highlight
          ? 'border-border/45 bg-muted/15'
          : 'border-border/50 bg-muted/8',
      )}
    >
      <p className="font-medium text-foreground">{label}</p>
      {typeof feasibility === 'number' ? (
        <p className="mt-1 text-muted-foreground">可执行性 {feasibility}/100</p>
      ) : null}
      {risk ? <p className="mt-0.5 text-muted-foreground">风险 {risk}</p> : null}
    </div>
  );
}
