import { cn } from '@/lib/utils';
import type { TeamGovernanceRule } from '@/api/automation-authorization.types';
import {
  formatGovernanceRuleSummary,
  type AutomationConfirmMember,
} from '@/lib/trip-automation-context.util';
import { tripAutomationSidebarCard } from './trip-automation-ui';

interface AutomationConfirmMembersProps {
  members: AutomationConfirmMember[];
  rules: TeamGovernanceRule[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

function MemberAvatar({ member, index }: { member: AutomationConfirmMember; index: number }) {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt=""
        className="h-7 w-7 rounded-full border-2 border-background object-cover"
      />
    );
  }
  const initial = member.label.trim().charAt(0).toUpperCase() || String.fromCharCode(65 + index);
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
      {initial}
    </div>
  );
}

export default function AutomationConfirmMembers({
  members,
  rules,
  isRefreshing,
  onRefresh,
  className,
}: AutomationConfirmMembersProps) {
  if (members.length === 0 && rules.length === 0) return null;

  return (
    <section className={cn(tripAutomationSidebarCard, className)}>
      <h3 className="text-sm font-semibold text-foreground">需确认成员</h3>
      {members.length > 0 ? (
        <div className="mt-3 flex items-center -space-x-2">
          {members.slice(0, 6).map((member, index) => (
            <MemberAvatar key={member.id} member={member} index={index} />
          ))}
          {members.length > 6 ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
              +{members.length - 6}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">暂无成员快照，请稍后刷新 context-snapshot</p>
          {onRefresh ? (
            <button
              type="button"
              className="text-[11px] font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              {isRefreshing ? '刷新中…' : '刷新成员快照'}
            </button>
          ) : null}
        </div>
      )}

      {rules.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {rules.slice(0, 4).map((rule) => (
            <li key={`${rule.topic}-${rule.rule}`} className="text-[11px] leading-relaxed text-muted-foreground">
              · {formatGovernanceRuleSummary(rule)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
