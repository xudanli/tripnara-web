import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import type { PlanDiffTimelineNode, PlanDiffTimelineTrack } from '@/lib/decision-space-plan-diff-view.util';

function formatDuration(minutes: number | undefined): string | null {
  if (minutes == null || minutes < 0) return null;
  return `${minutes}'`;
}

function TimelineTimesRow({
  nodes,
  variant,
  compact,
}: {
  nodes: PlanDiffTimelineNode[];
  variant: 'original' | 'proposed';
  compact?: boolean;
}) {
  const isProposed = variant === 'proposed';

  return (
    <div
      className="mb-0.5 grid w-full gap-x-0.5"
      style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))` }}
    >
      {nodes.map((node) => (
        <span
          key={`${node.id}_time`}
          className={cn(
            'truncate text-center tabular-nums',
            compact ? 'text-[10px]' : 'text-[11px]',
            isProposed
              ? node.unchanged
                ? 'font-medium text-foreground'
                : 'font-semibold text-gate-allow-foreground'
              : 'text-muted-foreground',
          )}
          title={node.time}
        >
          {node.time}
        </span>
      ))}
    </div>
  );
}

function TimelineRailRow({
  variant,
  nodes,
  compact,
}: {
  variant: 'original' | 'proposed';
  nodes: PlanDiffTimelineNode[];
  compact?: boolean;
}) {
  const isProposed = variant === 'proposed';

  return (
    <div className={cn('w-full', compact ? 'pb-0.5' : 'pb-1')}>
      <div className="flex w-full items-center">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const durationLabel = !isLast ? formatDuration(node.durationAfterMinutes) : null;

          return (
            <Fragment key={node.id}>
              <div className="relative z-[1] flex shrink-0 flex-col items-center">
                <span
                  className={cn(
                    'rounded-full',
                    compact ? 'h-2.5 w-2.5' : 'h-3 w-3',
                    isProposed
                      ? 'border-2 border-gate-allow bg-gate-allow'
                      : 'border-2 border-muted-foreground/45 bg-card',
                  )}
                  aria-hidden
                />
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'relative min-w-[1rem] flex-1',
                    compact ? 'mx-0.5 h-3.5' : 'mx-1 h-4',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 right-0 top-1/2 -translate-y-1/2',
                      isProposed
                        ? 'h-0.5 bg-gate-allow/75'
                        : 'border-t border-dashed border-muted-foreground/45',
                    )}
                    aria-hidden
                  />
                  {durationLabel ? (
                    <span
                      className={cn(
                        'absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap tabular-nums',
                        compact ? 'text-[8px]' : 'text-[9px]',
                        isProposed ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {durationLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function PlanDiffDualTimeline({
  tracks,
  compact = false,
  optionLetter = 'A',
}: {
  tracks: PlanDiffTimelineTrack[];
  compact?: boolean;
  optionLetter?: string;
}) {
  const original = tracks.find((track) => track.variant === 'original');
  const proposed = tracks.find((track) => track.variant === 'proposed');
  if (!original?.nodes.length) return null;

  const proposedNodes = proposed?.nodes.length ? proposed.nodes : original.nodes;
  const labels = original.nodes.map((node, index) => proposedNodes[index]?.label ?? node.label);

  return (
    <div
      className={cn(
        'rounded-md border border-border/50 bg-muted/5',
        compact ? 'px-2 py-2' : 'px-2.5 py-2.5',
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-end gap-2 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-px w-4 border-t border-dashed border-muted-foreground/50" />
          原计划
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-4 rounded-full bg-gate-allow/80" />
          新计划（方案 {optionLetter}）
        </span>
      </div>

      <div
        className="mb-1 grid w-full gap-x-0.5"
        style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        {labels.map((label, index) => (
          <p
            key={`${label}-${index}`}
            className="truncate text-center text-[9px] font-medium text-muted-foreground"
            title={label}
          >
            {label}
          </p>
        ))}
      </div>

      <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
        <div>
          <TimelineTimesRow compact={compact} nodes={original.nodes} variant="original" />
          <TimelineRailRow compact={compact} nodes={original.nodes} variant="original" />
        </div>

        <div className={compact ? 'pt-2' : 'pt-2.5'}>
          <TimelineTimesRow compact={compact} nodes={proposedNodes} variant="proposed" />
          <TimelineRailRow compact={compact} nodes={proposedNodes} variant="proposed" />
        </div>
      </div>
    </div>
  );
}
