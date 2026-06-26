import { UserRound, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActiveTripCrewMember } from '@/types/active-trip-dashboard';

type CrewDnaPanelProps = {
  crew: ActiveTripCrewMember[];
  className?: string;
};

/** 车队 DNA 看板 · 只读 */
export function CrewDnaPanel({ crew, className }: CrewDnaPanelProps) {
  if (!crew.length) return null;

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="车队 DNA 看板"
    >
      <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
        <Users className="h-4 w-4 text-primary" aria-hidden />
        车队 DNA
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">MBTI · 称号</p>

      <ul className="mt-3 space-y-2">
        {crew.map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/60 px-3 py-2"
          >
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="font-medium text-foreground">{member.displayName}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {member.role === 'captain' ? '队长' : '队员'}
            </Badge>
            {member.mbtiType && (
              <span className="text-xs text-muted-foreground">{member.mbtiType}</span>
            )}
            {member.cardTitle && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{member.cardTitle}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
