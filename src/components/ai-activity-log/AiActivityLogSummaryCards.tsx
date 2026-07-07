import { Bot, CheckCircle2, Clock, Shield } from 'lucide-react';
import type { AiActivityLogSummary } from '@/api/ai-activity-log.types';
import {
  formatAiActivityLogDelta,
  formatAiActivityLogTime,
} from '@/lib/ai-activity-log-display.util';
import {
  aiActivityLogSummaryCard,
  aiActivityLogSummaryIconShell,
} from './ai-activity-log-ui';

interface AiActivityLogSummaryCardsProps {
  summary: AiActivityLogSummary;
  className?: string;
}

export default function AiActivityLogSummaryCards({
  summary,
  className,
}: AiActivityLogSummaryCardsProps) {
  const deltaLabel = formatAiActivityLogDelta(summary.todayActionDelta);
  const latest = summary.latestRevalidation;
  const latestTime = latest?.occurredAt ? formatAiActivityLogTime(latest.occurredAt) : '—';
  const scoreBefore = latest?.feasibilityScoreBefore;
  const scoreAfter = latest?.feasibilityScoreAfter;
  const scoreLine =
    typeof scoreBefore === 'number' && typeof scoreAfter === 'number'
      ? `可执行性 ${scoreBefore} → ${scoreAfter}`
      : latest?.title;

  return (
    <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>
      <article className={aiActivityLogSummaryCard}>
        <div className="flex items-start gap-3">
          <div className={aiActivityLogSummaryIconShell('neutral')}>
            <Bot className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">今日 AI 动作数</p>
            <p className="mt-1 font-mono-brand text-2xl font-semibold tabular-nums text-foreground">
              {summary.todayActionCount}
              <span className="ml-1 text-sm font-medium text-muted-foreground">次</span>
            </p>
            {deltaLabel ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{deltaLabel}</p>
            ) : null}
          </div>
        </div>
      </article>

      <article className={aiActivityLogSummaryCard}>
        <div className="flex items-start gap-3">
          <div className={aiActivityLogSummaryIconShell('success')}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">自动完成</p>
            <p className="mt-1 font-mono-brand text-2xl font-semibold tabular-nums text-foreground">
              {summary.autoCompletedCount}
              <span className="ml-1 text-sm font-medium text-muted-foreground">次</span>
            </p>
            {typeof summary.autoCompletedPct === 'number' ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {summary.autoCompletedPct}%
              </p>
            ) : null}
          </div>
        </div>
      </article>

      <article className={aiActivityLogSummaryCard}>
        <div className="flex items-start gap-3">
          <div className={aiActivityLogSummaryIconShell('warning')}>
            <Clock className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">等待确认</p>
            <p className="mt-1 font-mono-brand text-2xl font-semibold tabular-nums text-foreground">
              {summary.waitingConfirmCount}
              <span className="ml-1 text-sm font-medium text-muted-foreground">次</span>
            </p>
            {typeof summary.waitingConfirmPct === 'number' ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {summary.waitingConfirmPct}%
              </p>
            ) : null}
          </div>
        </div>
      </article>

      <article className={aiActivityLogSummaryCard}>
        <div className="flex items-start gap-3">
          <div className={aiActivityLogSummaryIconShell('info')}>
            <Shield className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">最近一次重验证</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{latestTime}</p>
            {scoreLine ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{scoreLine}</p>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
