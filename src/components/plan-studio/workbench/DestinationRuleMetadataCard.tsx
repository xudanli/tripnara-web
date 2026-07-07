import { Globe2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { DestinationRuleMetadata } from '@/types/destination-rules';
import { workbenchAccentIconClass } from './workbench-ui';

export interface DestinationRuleMetadataCardProps {
  metadata: DestinationRuleMetadata;
  ruleLabel: string;
  compact?: boolean;
  className?: string;
}

function tierBadgeClass(tier: DestinationRuleMetadata['tier']): string {
  switch (tier) {
    case 'BLOCK':
      return 'border-border/50 text-error';
    case 'CONDITIONAL':
      return 'border-border/50 text-warning';
    default:
      return 'border-border/50 text-foreground';
  }
}

function evidenceBadgeClass(status: DestinationRuleMetadata['evidenceStatus']): string {
  if (status === 'VERIFIED' || status === 'CURRENT') {
    return 'border-border/40 text-success';
  }
  if (status === 'OUTDATED' || status === 'PENDING') {
    return 'border-border/50 text-warning';
  }
  return 'text-muted-foreground';
}

/** 目的地规则元数据：来源 / 范围 / 判定 / 违反 / 证据 */
export function DestinationRuleMetadataCard({
  metadata,
  ruleLabel,
  compact = false,
  className,
}: DestinationRuleMetadataCardProps) {
  const rows = [
    { label: '来源', value: metadata.sourceLabel },
    { label: '适用范围', value: metadata.scopeLabel },
    { label: '判定条件', value: metadata.judgmentRule },
    { label: '违反结果', value: metadata.violationLabel, emphasize: metadata.blocksExecution },
    { label: '证据状态', value: metadata.evidenceStatusLabel },
  ];

  if (compact) {
    return (
      <div className={cn('space-y-0.5 text-[9px] leading-snug text-muted-foreground', className)}>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn('h-4 px-1 text-[8px] font-normal', tierBadgeClass(metadata.tier))}>
            {metadata.tierLabel}
          </Badge>
          <span className="text-muted-foreground/70">{metadata.categoryLabel}</span>
        </div>
        {rows.slice(1, 4).map((row) => (
          <p key={row.label}>
            <span className="text-muted-foreground/80">{row.label}：</span>
            <span className={row.emphasize ? 'text-error' : undefined}>{row.value}</span>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/8 p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Globe2 className={cn('mt-0.5 h-4 w-4 shrink-0', workbenchAccentIconClass)} aria-hidden />
          <div>
            <p className="text-xs font-semibold text-foreground">目的地规则 · {ruleLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{metadata.categoryLabel}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-normal', tierBadgeClass(metadata.tier))}>
            {metadata.tierLabel}
          </Badge>
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-normal', evidenceBadgeClass(metadata.evidenceStatus))}>
            {metadata.evidenceStatusLabel}
          </Badge>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        系统加载 · 不可编辑或关闭
        {metadata.canSetMoreConservative ? ' · 建议型可设置更保守' : null}
      </div>

      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[4.5rem_1fr] gap-x-2 text-[11px]">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                'leading-snug text-foreground/90',
                row.emphasize && 'font-semibold text-error',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {metadata.tripImpact ? (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
          <p className="text-[10px] font-semibold text-foreground">对行程的影响</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{metadata.tripImpact}</p>
        </div>
      ) : null}
    </div>
  );
}
