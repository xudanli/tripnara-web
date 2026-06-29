import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { memberRoleLabel } from '@/lib/team-tab-model';
import type { TeamMember } from '@/types/optimization-v2';
import { CollabWidgetCard } from './CollabWidgetCard';

interface MembersRolesWidgetProps {
  members: TeamMember[];
  loading?: boolean;
}

export function MembersRolesWidget({ members, loading }: MembersRolesWidgetProps) {
  return (
    <CollabWidgetCard title="成员与角色" description={`${members.length} 位成员`}>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无成员，请邀请同行者。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">成员</th>
                <th className="pb-2 pr-2 font-medium">角色</th>
                <th className="pb-2 font-medium">决策权重</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const weightPct = Math.round((member.decisionWeight ?? 0) * 100);
                return (
                  <tr key={member.userId} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <CollaboratorAvatar displayName={member.displayName} size="sm" />
                        <span className="font-medium text-foreground">{member.displayName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-muted-foreground">
                      {memberRoleLabel(member)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Progress value={weightPct} className="h-1.5 w-16" />
                        <span className="tabular-nums text-muted-foreground">{weightPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CollabWidgetCard>
  );
}
