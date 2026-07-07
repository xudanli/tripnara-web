import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanGateMemberChange } from '@/types/plan-gate';
import {
  PLAN_GATE_MEMBER_CHANGE_LABEL,
  planGateMemberChangeClass,
} from '@/lib/plan-gate-draft-diff.util';
import { planGateCard } from './plan-gate-ui';

export interface PlanGateMemberChangesPanelProps {
  memberChanges: PlanGateMemberChange[];
  className?: string;
  title?: string;
}

export function PlanGateMemberChangesPanel({
  memberChanges,
  className,
  title = '成员分流变化',
}: PlanGateMemberChangesPanelProps) {
  if (memberChanges.length === 0) return null;

  const missingMeetupCount = memberChanges.filter((c) => c.missingMeetup).length;

  return (
    <div className={cn(planGateCard, className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-foreground">{title}</h4>
        {missingMeetupCount > 0 ? (
          <Badge variant="outline" className="text-[10px] text-gate-reject-foreground">
            {missingMeetupCount} 处缺少汇合点
          </Badge>
        ) : null}
      </div>
      <ul className="space-y-2">
        {memberChanges.map((change, index) => (
          <li
            key={`${change.kind}-${change.day}-${index}`}
            className={cn('rounded-lg border px-2.5 py-2', planGateMemberChangeClass(change))}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-foreground">
                {change.label}
                {` · 第 ${change.day} 天`}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {PLAN_GATE_MEMBER_CHANGE_LABEL[change.kind as keyof typeof PLAN_GATE_MEMBER_CHANGE_LABEL] ??
                    change.kind}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {change.impact === 'high' ? '高影响' : change.impact === 'medium' ? '中影响' : '低影响'}
                </Badge>
              </div>
            </div>
            {change.before && change.after ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {change.before} → {change.after}
              </p>
            ) : null}
            {change.missingMeetup ? (
              <p className="mt-1 text-[11px] text-gate-reject-foreground">缺少汇合点，暂不可提交</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
