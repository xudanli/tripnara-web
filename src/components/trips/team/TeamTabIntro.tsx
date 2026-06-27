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
    { icon: Users, title: '单人也能规划', body: '出行人数在上方「固化约束」里设置即可，这里只有在你邀请同行者时才需要。' },
  ],
  'empty-group': [
    { icon: UserPlus, title: '先列出同行者', body: '上方约束里的「N 人出行」只是规划假设；这里要录入真实同行者，系统才能对齐偏好。' },
    { icon: Handshake, title: '再决定谁拍板', body: '补充体力、预算倾向后，可选择平等商量或领队说了算。' },
  ],
  setup: [
    { icon: UserPlus, title: '补充同行者信息', body: '带「待补充」标记的是占位成员，请点进去填写姓名和偏好。' },
  ],
  ready: [
    { icon: Handshake, title: '可以一起定方案了', body: '成员信息齐全后，可检查大家是否合拍，或在右上角用「结构化协商」。' },
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
        <h2 className="font-semibold text-foreground">同行者与决策</h2>
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
