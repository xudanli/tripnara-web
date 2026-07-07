import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConstraintListEntry } from './constraint-console-types';
import { OFFICIAL_RULE_READONLY_HINT } from '@/lib/constraint-console-partition.util';
import { buildDestinationRuleMetadata } from '@/lib/destination-rules.util';
import { DestinationRuleMetadataCard } from './DestinationRuleMetadataCard';

export interface ConstraintExternalDetailPanelProps {
  entry: ConstraintListEntry;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenFeasibilityReport?: () => void;
  className?: string;
}

/** 中栏 · 单条目的地规则详情（只读） */
export function ConstraintExternalDetailPanel({
  entry,
  onRefresh,
  refreshing,
  onOpenFeasibilityReport,
  className,
}: ConstraintExternalDetailPanelProps) {
  const destinationRule =
    entry.destinationRule ?? buildDestinationRuleMetadata({ entry });

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">目的地规则详情</h2>
        <Badge variant="outline" className="h-5 text-[10px] font-normal text-muted-foreground">
          只读 · 查看与确认
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <DestinationRuleMetadataCard metadata={destinationRule} ruleLabel={entry.label} />

        {entry.value ? (
          <section className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground">当前快照</p>
            <p className="mt-1 text-xs text-foreground/90">{entry.value}</p>
          </section>
        ) : null}

        <section className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {OFFICIAL_RULE_READONLY_HINT}
          {destinationRule.tier === 'ADVISORY' ? ' 建议型规则可设置更保守的用户偏好，但不可突破官方底线。' : null}
        </section>

        {onOpenFeasibilityReport ? (
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenFeasibilityReport}>
            查看可执行性证明
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end border-t border-border/50 px-5 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          刷新证据
        </Button>
      </div>
    </div>
  );
}
