import { Users, UserPlus, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamTabIntroProps {
  phase: 'empty-solo' | 'empty-group' | 'setup' | 'ready';
  plannedTravelerCount?: number;
  memberCount?: number;
  pendingMemberCount?: number;
  className?: string;
}

const STEPS = {
  'empty-solo': [
    { icon: Users, title: '单人也能规划', body: '出行人数在上方「固化约束」里设置即可；多人出行时通过邀请码收集偏好。' },
  ],
  'empty-group': [
    { icon: UserPlus, title: '发送邀请码', body: '成员通过问卷提交偏好后，可在「团队需求画像」查看汇总。' },
    { icon: Handshake, title: '再一起定方案', body: '偏好齐全后，可检查是否合拍并发起协调。' },
  ],
  setup: [
    { icon: UserPlus, title: '等待成员提交问卷', body: '「团队需求画像」会显示谁还未完成偏好填写。' },
  ],
  ready: [
    { icon: Handshake, title: '可以一起定方案了', body: '成员偏好齐全后，可检查大家是否合拍并发起行程协调。' },
  ],
} as const;

export function TeamTabIntro({
  phase,
  plannedTravelerCount,
  memberCount = 0,
  pendingMemberCount = 0,
  className,
}: TeamTabIntroProps) {
  const steps = STEPS[phase];

  return (
    <section
      className={cn(
        'rounded-xl border border-border/70 bg-muted/20 px-4 py-3.5 text-sm shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-foreground">团队协调</h2>
        {phase === 'empty-group' && plannedTravelerCount ? (
          <span className="text-xs text-muted-foreground">约束里已设 {plannedTravelerCount} 人出行</span>
        ) : null}
        {phase === 'setup' && pendingMemberCount > 0 ? (
          <span className="text-xs text-amber-800 dark:text-amber-200">
            {pendingMemberCount} 位待补充
          </span>
        ) : null}
        {phase === 'ready' && memberCount > 0 ? (
          <span className="text-xs text-muted-foreground">{memberCount} 位同行者</span>
        ) : null}
      </div>
      <ul className="mt-3 space-y-2.5">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-2.5">
            <step.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium leading-snug">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function isGuestTeamMember(userId: string): boolean {
  return userId.startsWith('guest_');
}

export function countPendingTeamMembers(
  members: Array<{ userId: string }>,
): number {
  return members.filter((m) => isGuestTeamMember(m.userId)).length;
}
