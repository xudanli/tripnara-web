import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkbenchGateStatusBanner } from '@/components/plan-studio/workbench/WorkbenchGateStatusBanner';
import type { PlanGateVerificationModel } from '@/lib/plan-gate-verification.util';
import { planGateDimensionStatusClass } from '@/lib/plan-gate-verification.util';
import { planGateCard, planGateSectionTitle } from './plan-gate-ui';

export interface PlanGateVerificationPanelProps {
  model: PlanGateVerificationModel;
  className?: string;
}

export function PlanGateVerificationPanel({ model, className }: PlanGateVerificationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={cn(planGateCard, 'space-y-3', className)}>
      <div className="space-y-2">
        <h3 className={planGateSectionTitle}>方案验证结果</h3>
        <WorkbenchGateStatusBanner
          status={model.overallGateStatus}
          message={`综合状态：${model.overallLabel}${model.draftLabel ? ` · 草案 ${model.draftLabel}` : ''}`}
          size="sm"
        />
      </div>

      <ul className="space-y-1.5">
        {model.dimensions.map((dimension) => {
          const expanded = expandedId === dimension.id;
          return (
            <li key={dimension.id} className="rounded-lg border border-border/60 bg-background/80">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                onClick={() => setExpandedId(expanded ? null : dimension.id)}
              >
                <span className="text-xs text-foreground">{dimension.label}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      planGateDimensionStatusClass(dimension.status),
                    )}
                  >
                    {dimension.statusLabel}
                  </span>
                  {dimension.detailItems.length > 0 ? (
                    expanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )
                  ) : null}
                </span>
              </button>
              {expanded && dimension.detailItems.length > 0 ? (
                <ul className="space-y-1 border-t border-border/40 px-3 py-2">
                  {dimension.detailItems.map((item) => (
                    <li key={item} className="text-[11px] leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {model.pendingConfirmations.length > 0 ? (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-medium text-foreground">需要你确认</p>
          {model.pendingConfirmations.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gate-confirm-border/40 bg-gate-confirm/8 px-2.5 py-2"
            >
              <p className="text-[11px] font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
