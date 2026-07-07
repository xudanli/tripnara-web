import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { CROSS_LEVEL_LABEL, crossLevelBadgeClass, negotiationStatusClass } from '@/components/domain-influence/domain-influence-ui';
import { buildSpeakerSlots } from '@/lib/collab-negotiation-stage';
import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import { cn } from '@/lib/utils';

interface CollabNegotiationTopicHeaderProps {
  task: DomainNegotiationTask;
  detail: PreferenceRoundDetail | null;
  className?: string;
}

function crossLevelConflictLabel(level: DomainNegotiationTask['crossLevel']): string {
  if (level === 'high') return '高';
  if (level === 'medium') return '中';
  return '低';
}

export function CollabNegotiationTopicHeader({
  task,
  detail,
  className,
}: CollabNegotiationTopicHeaderProps) {
  const speakers = buildSpeakerSlots(detail);
  const memberCount = speakers.length || task.claimCount || 0;
  const dissentCount = detail?.utterances.length ?? task.claimCount ?? 0;
  const domainLabel = WISH_CATEGORY_LABELS[task.domain] ?? task.domain;

  return (
    <header className={cn('min-w-0 flex-1 space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-primary">当前协作议题</span>
        <Badge
          variant="outline"
          className={cn('h-5 text-[10px] font-normal', negotiationStatusClass(task.status))}
        >
          {task.statusLabel}
        </Badge>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{task.title}</h2>
        {task.description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-3 border-y border-border/50 py-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            影响的行程
          </dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{domainLabel}</dd>
          {task.closesAt ? (
            <dd className="mt-0.5 text-[11px] text-muted-foreground">
              截止 {new Date(task.closesAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </dd>
          ) : null}
        </div>

        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            参与协商成员
          </dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-1">
            {speakers.length > 0 ? (
              speakers.slice(0, 6).map((slot) => (
                <CollaboratorAvatar
                  key={slot.userId}
                  displayName={slot.displayName}
                  size="sm"
                  highlight={slot.isCurrent ? 'current' : slot.hasSpoken ? 'spoken' : 'none'}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {memberCount > 0 ? `${memberCount} 人` : '待成员加入'}
              </span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            分歧程度
          </dt>
          <dd className="mt-1 flex items-center gap-1.5">
            <AlertTriangle
              className={cn(
                'h-3.5 w-3.5',
                task.crossLevel === 'high'
                  ? 'text-gate-confirm-foreground'
                  : 'text-muted-foreground',
              )}
            />
            <span className="text-sm font-semibold text-foreground">
              {crossLevelConflictLabel(task.crossLevel)}
            </span>
            {dissentCount > 0 ? (
              <span className="text-sm tabular-nums text-muted-foreground">({dissentCount})</span>
            ) : null}
            <Badge
              variant="outline"
              className={cn('ml-1 h-5 text-[10px] font-normal', crossLevelBadgeClass(task.crossLevel))}
            >
              {CROSS_LEVEL_LABEL[task.crossLevel]}
            </Badge>
          </dd>
        </div>
      </dl>
    </header>
  );
}
