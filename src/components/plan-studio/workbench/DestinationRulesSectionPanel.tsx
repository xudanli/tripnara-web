import { ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ConstraintListEntry } from './constraint-console-types';
import {
  CONSTRAINT_SOURCE_LAYERS,
  DESTINATION_RULES_PIPELINE,
  DESTINATION_RULES_SECTION_INTRO,
  groupDestinationRules,
} from '@/lib/destination-rules.util';

export interface DestinationRulesSectionPanelProps {
  items: ConstraintListEntry[];
  onSelectRule?: (id: string) => void;
  onOpenFeasibilityReport?: () => void;
  onRunConstraintCheck?: () => void;
  className?: string;
}

/** 右栏 · 目的地规则分区总览 */
export function DestinationRulesSectionPanel({
  items,
  onSelectRule,
  onOpenFeasibilityReport,
  onRunConstraintCheck,
  className,
}: DestinationRulesSectionPanelProps) {
  const groups = groupDestinationRules(items);
  const blockCount = items.filter((item) => item.destinationRule?.tier === 'BLOCK').length;
  const conflictCount = items.filter((item) => item.hasConflict).length;

  return (
    <div className={cn('flex h-full flex-col overflow-y-auto', className)}>
      <div className="mx-auto w-full max-w-xl flex-1 p-4">
      <h3 className="text-sm font-semibold text-foreground">目的地规则</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{DESTINATION_RULES_SECTION_INTRO}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/60 px-2 py-2">
          <p className="text-lg font-bold tabular-nums">{items.length}</p>
          <p className="text-[10px] text-muted-foreground">当前生效</p>
        </div>
        <div className="rounded-lg border border-border/60 px-2 py-2">
          <p className="text-lg font-bold tabular-nums text-error">{blockCount}</p>
          <p className="text-[10px] text-muted-foreground">不可突破</p>
        </div>
        <div className="rounded-lg border border-border/60 px-2 py-2">
          <p className="text-lg font-bold tabular-nums">{conflictCount}</p>
          <p className="text-[10px] text-muted-foreground">触发冲突</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">与可执行性证明</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{DESTINATION_RULES_PIPELINE}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {onRunConstraintCheck ? (
            <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={onRunConstraintCheck}>
              运行约束检查
            </Button>
          ) : null}
          {onOpenFeasibilityReport ? (
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={onOpenFeasibilityReport}>
              <ExternalLink className="h-3 w-3" />
              可执行性证明
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">约束来源层级</p>
        <ul className="space-y-1">
          {CONSTRAINT_SOURCE_LAYERS.map((row) => (
            <li key={row.layer} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-foreground/90">{row.layer}</span>
              <span className="text-muted-foreground">{row.editable}</span>
            </li>
          ))}
        </ul>
      </div>

      {groups.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-foreground">按类别浏览</p>
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-1 text-[10px] font-medium text-muted-foreground">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-2 text-left hover:bg-muted/20"
                      onClick={() => onSelectRule?.(item.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          暂无已加载的目的地规则。请确认 BFF 返回 OFFICIAL_RULE 约束，或目的地包已绑定本行程。
        </p>
      )}
      </div>
    </div>
  );
}
