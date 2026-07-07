import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConstraintListEntry } from './constraint-console-types';
import { SoftPreferencePriorityPicker } from './SoftPreferencePriorityPicker';
import {
  SOFT_PREFER_EXAMPLE_BULLETS,
  SOFT_PREFER_SECTION_INTRO,
  resolveSoftConstraintDescription,
} from '@/lib/soft-constraint.util';
import {
  resolveSoftTemplateCanonicalWeightKey,
  softUiPriorityToSolverWeight,
} from '@/lib/soft-constraint-solver.util';
import { sliderToSoftPriority } from './constraint-console-view.util';
import { getSoftConstraintTemplate } from './constraint-templates';
import type { ConstraintEntryScopeContext } from '@/lib/constraint-entry-scope-context.util';
import { ConstraintEntryScopeCard } from './ConstraintEntryScopeCard';
import {
  workbenchConstraintListItemIcon,
  workbenchSoftSacrificedSurface,
  workbenchSoftSacrificedTitle,
} from './workbench-ui';

export interface SoftConstraintDetailCardProps {
  entry: ConstraintListEntry;
  scopeContext?: ConstraintEntryScopeContext | null;
  onPriorityChange?: (id: string, sliderValue: number) => void;
  className?: string;
}

/** 右栏 · 单条软约束说明 + 重要程度 */
export function SoftConstraintDetailCard({
  entry,
  scopeContext,
  onPriorityChange,
  className,
}: SoftConstraintDetailCardProps) {
  const description = resolveSoftConstraintDescription(
    entry.description,
    getSoftConstraintTemplate(entry.id)?.description,
  );
  const priority = entry.sliderValue != null ? sliderToSoftPriority(entry.sliderValue) : '中';
  const templateId = entry.id.startsWith('c_tpl_') ? entry.id.slice(6) : entry.id;
  const canonicalKey = resolveSoftTemplateCanonicalWeightKey(templateId);
  const solverWeight = softUiPriorityToSolverWeight(priority);

  return (
    <div className={cn('space-y-4 p-4', className)}>
      <div className="flex items-start gap-2">
        <span className={cn(workbenchConstraintListItemIcon, 'border-border/40 bg-muted/15')}>
          <Leaf className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{entry.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">可协商 · 尽量满足</p>
        </div>
      </div>

      {description ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      <ConstraintEntryScopeCard scope={scopeContext} />

      {entry.softSacrificed ? (
        <div className={workbenchSoftSacrificedSurface}>
          <p className={workbenchSoftSacrificedTitle}>本次方案已取舍</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {entry.softTradeoffMessage ??
              '为兼顾更高优先级偏好，此项已在当前行程中适度放宽，不再重复报日程违规。'}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">{SOFT_PREFER_SECTION_INTRO}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">当前重要程度</p>
        <SoftPreferencePriorityPicker
          sliderValue={entry.sliderValue ?? 50}
          onCommit={(value) => onPriorityChange?.(entry.id, value)}
        />
        <p className="text-[10px] text-muted-foreground">
          当前为「{priority}」— 与其他软约束冲突时，系统会优先保留重要程度更高的项。
          {canonicalKey
            ? ` 求解器权重 ${solverWeight.toFixed(1)}（priority/10）→ ${canonicalKey}。`
            : ` 求解器权重 ${solverWeight.toFixed(1)}（priority/10）。`}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border/50 bg-background/50 p-3">
        <p className="text-[10px] font-medium text-muted-foreground">常见软约束示例</p>
        <ul className="mt-2 space-y-1">
          {SOFT_PREFER_EXAMPLE_BULLETS.map((line) => (
            <li key={line} className="text-[10px] leading-relaxed text-muted-foreground">
              · {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
