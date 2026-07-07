import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ConstraintEntryScopeContext } from '@/lib/constraint-entry-scope-context.util';
import { workbenchSoftSacrificedBadge } from './workbench-ui';

export interface ConstraintEntryScopeCardProps {
  scope: ConstraintEntryScopeContext | null | undefined;
  className?: string;
  compact?: boolean;
}

function severityLabel(severity?: string): string | null {
  switch (severity) {
    case 'must_handle':
      return '必须处理';
    case 'suggest_adjust':
      return '建议调整';
    case 'pending_confirm':
      return '待确认';
    default:
      return null;
  }
}

/** 约束影响范围 · 天次 + 路线/活动上下文 */
export function ConstraintEntryScopeCard({
  scope,
  className,
  compact = false,
}: ConstraintEntryScopeCardProps) {
  if (!scope?.lines.length) return null;

  if (compact) {
    const line = scope.lines[0]!;
    return (
      <p className={cn('text-[10px] leading-snug text-muted-foreground', className)}>
        {line.dayBadge ? (
          <span className="font-medium text-foreground/80">{line.dayBadge}</span>
        ) : null}
        {line.dayBadge && line.summary ? <span className="mx-1 text-muted-foreground/50">·</span> : null}
        {line.summary ? <span>{line.summary}</span> : null}
      </p>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/10 p-3', className)}>
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium text-foreground">当前影响范围</p>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        与本次行程检查相关的具体天次与路段，便于判断该偏好是否值得坚持。
      </p>
      <ul className="mt-3 space-y-2">
        {scope.lines.slice(0, 5).map((line) => {
          const severity = severityLabel(line.severity);
          return (
            <li
              key={`${line.dayNumbers.join('-')}-${line.summary}-${line.source}`}
              className="rounded-lg border border-border/50 bg-background/80 px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {line.dayBadge ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                    {line.dayBadge}
                  </Badge>
                ) : null}
                {severity ? (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                    {severity}
                  </Badge>
                ) : null}
                {line.source === 'tradeoff' ? (
                  <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-normal', workbenchSoftSacrificedBadge)}>
                    已取舍
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{line.summary}</p>
            </li>
          );
        })}
      </ul>
      {scope.lines.length > 5 ? (
        <p className="mt-2 text-[10px] text-muted-foreground">另有 {scope.lines.length - 5} 处相关提示</p>
      ) : null}
    </div>
  );
}
