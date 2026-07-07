import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatIsoDateTimesInDisplayText } from '@/components/plan-studio/workbench/workbench-format.util';
import { decisionActionDisplayTitle } from '@/lib/decision-action-display.util';
import type { DecisionSpaceResultLayers } from '@/lib/decision-space-result-card.util';
import {
  decisionActionSourceLabel,
  decisionOriginLabel,
  formatDecisionDetectorLabels,
} from '@/lib/decision-problem-display.util';
import { openDecisionActionExternalUrl, resolveDecisionActionExternalUrl } from '@/lib/decision-action.util';
import type { DecisionAction } from '@/generated/unified-decision-contracts';

export interface DecisionActionCardProps {
  action: DecisionAction;
  /** select：单选列表；action：独立提交/预览按钮 */
  variant?: 'select' | 'action';
  selected?: boolean;
  loading?: boolean;
  previewLoading?: boolean;
  recommended?: boolean;
  resultLayers?: DecisionSpaceResultLayers;
  submitLabel?: string;
  previewLabel?: string;
  displayTimezone?: string;
  onClick?: (action: DecisionAction) => void;
  onSelect?: (action: DecisionAction) => void;
  onPreview?: (action: DecisionAction) => void;
  /** 横向滚动窄卡：标题与摘要更紧凑 */
  compact?: boolean;
  className?: string;
}

function formatActionDisplayText(text: string | undefined, timezone?: string): string | undefined {
  if (!text?.trim()) return undefined;
  return formatIsoDateTimesInDisplayText(text, timezone);
}

function ActionSourceBadges({ action }: { action: DecisionAction }) {
  return (
    <>
      {action.source ? (
        <Badge variant="secondary" className="h-5 text-[11px] font-normal">
          {decisionActionSourceLabel(action.source)}
        </Badge>
      ) : null}
      {action.origin ? (
        <Badge variant="outline" className="h-5 text-[11px] font-normal">
          {decisionOriginLabel(action.origin)}
        </Badge>
      ) : null}
      {formatDecisionDetectorLabels(action.detectors).map((label) => (
        <Badge key={label} variant="outline" className="h-5 text-[11px] font-normal">
          {label}
        </Badge>
      ))}
    </>
  );
}

/** SSOT v2 — detail.actions[] 方案卡片（勿读 repairOptions / planBHints / option.source） */
export function DecisionActionCard({
  action,
  variant = 'action',
  selected,
  loading,
  previewLoading,
  recommended,
  resultLayers,
  submitLabel = '提交结论',
  previewLabel = '预览影响',
  displayTimezone,
  onClick,
  onSelect,
  onPreview,
  compact = false,
  className,
}: DecisionActionCardProps) {
  const disabled = !action.allowed || loading || previewLoading;
  const displayTitle =
    formatActionDisplayText(
      variant === 'select' ? decisionActionDisplayTitle(action) : action.title ?? action.label,
      displayTimezone,
    ) ??
    action.title ??
    action.label;
  const displaySummary =
    formatActionDisplayText(action.summary ?? action.description, displayTimezone) ??
    action.summary ??
    action.description;
  const displayExpectedImpact = formatActionDisplayText(action.expectedImpact, displayTimezone);
  const displayBlockedReason = formatActionDisplayText(action.blockedReason, displayTimezone);
  const externalUrl = resolveDecisionActionExternalUrl(action);
  const isPreviewKind = action.kind === 'preview';

  if (variant === 'select') {
    if (compact) {
      return (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onSelect?.(action)}
          className={cn(
            'grid w-full grid-cols-[1rem_minmax(0,1fr)] gap-x-2 rounded-xl border p-3 text-left transition-colors',
            selected
              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/25'
              : 'border-border/60 bg-card hover:bg-muted/15',
            disabled && 'cursor-not-allowed opacity-60',
            className,
          )}
        >
          <Circle
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              selected ? 'fill-primary text-primary' : 'text-muted-foreground/45',
            )}
            strokeWidth={selected ? 0 : 2}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold leading-snug text-foreground">{displayTitle}</p>
              {recommended ? (
                <Badge variant="secondary" className="h-5 shrink-0 text-[11px] font-normal">
                  推荐
                </Badge>
              ) : null}
            </div>
            {displaySummary && !resultLayers ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {displaySummary}
              </p>
            ) : null}
            {resultLayers?.outcomes.length ? (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">结果</p>
                {resultLayers.outcomes.slice(0, 3).map((line) => (
                  <p key={line} className="text-[11px] leading-snug text-foreground/90">
                    · {line}
                  </p>
                ))}
              </div>
            ) : null}
            {resultLayers?.costs.length ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">代价</p>
                {resultLayers.costs.slice(0, 2).map((line) => (
                  <p key={line} className="text-[11px] leading-snug text-gate-confirm-foreground">
                    · {line}
                  </p>
                ))}
              </div>
            ) : null}
            {resultLayers?.impactScope.length ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">影响范围</p>
                {resultLayers.impactScope.slice(0, 2).map((line) => (
                  <p key={line} className="text-[11px] leading-snug text-muted-foreground">
                    · {line}
                  </p>
                ))}
              </div>
            ) : null}
            {!action.allowed && displayBlockedReason ? (
              <p className="mt-1 line-clamp-2 text-[11px] text-gate-confirm-foreground">{displayBlockedReason}</p>
            ) : null}
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => onSelect?.(action)}
        className={cn(
          'flex w-full flex-col items-start overflow-hidden rounded-xl border text-left transition-colors',
          'gap-2.5 px-3 py-2.5',
          selected
            ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/25'
            : 'border-border/60 bg-card hover:bg-muted/15',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <div className="flex w-full min-w-0 items-start gap-2">
        <Circle
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            selected ? 'fill-primary text-primary' : 'text-muted-foreground/45',
          )}
          strokeWidth={selected ? 0 : 2}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold leading-snug text-foreground">{displayTitle}</p>
            {recommended ? (
              <Badge variant="secondary" className="h-5 shrink-0 text-[11px] font-normal">
                推荐
              </Badge>
            ) : null}
            <ActionSourceBadges action={action} />
          </div>
          {displaySummary && !resultLayers ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{displaySummary}</p>
          ) : null}
          {resultLayers?.systemJudgment ? (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">系统判断 · </span>
              {resultLayers.systemJudgment}
            </p>
          ) : null}
          {!action.allowed && displayBlockedReason ? (
            <p className="mt-1 text-[11px] text-gate-confirm-foreground">{displayBlockedReason}</p>
          ) : null}
          {action.allowed && externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] font-medium text-primary underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              打开官方预订页
            </a>
          ) : null}
        </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-3 py-2.5 text-left transition-colors',
        selected ? 'border-primary/50 ring-2 ring-primary/30' : 'border-border/60',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{displayTitle}</p>
            <ActionSourceBadges action={action} />
          </div>
          {displaySummary ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{displaySummary}</p>
          ) : null}
          {displayExpectedImpact ? (
            <p className="mt-1 text-[11px] text-muted-foreground/80">{displayExpectedImpact}</p>
          ) : null}
          {!action.allowed && displayBlockedReason ? (
            <p className="mt-1 text-[11px] text-gate-confirm-foreground">{displayBlockedReason}</p>
          ) : null}
        </div>
      </div>
      {isPreviewKind && onPreview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          disabled={disabled}
          onClick={() => onPreview(action)}
        >
          {previewLoading ? '预览中…' : previewLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant={selected ? 'default' : 'outline'}
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          disabled={disabled}
          onClick={() => onClick?.(action)}
        >
          {action.allowed ? submitLabel : '不可用'}
        </Button>
      )}
      {action.allowed && externalUrl ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto w-full p-0 text-[11px]"
          onClick={() => openDecisionActionExternalUrl(externalUrl)}
        >
          前往官方预订
        </Button>
      ) : null}
    </div>
  );
}
