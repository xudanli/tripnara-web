import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { Collaborator, PersonaAlert } from '@/types/trip';
import type { DecisionOption } from '@/types/decision-problem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildTeamStanceCards, type TeamStanceCardView, type TeamStanceLevel } from '@/lib/team-stance.util';
import { WorkbenchPersonaSymbol } from './WorkbenchPersonaSymbol';
import { CollaboratorAvatarFromRecord } from './CollaboratorAvatar';
import { workbenchCard } from './workbench-ui';

const LEVEL_BADGE_CLASS: Record<TeamStanceLevel, string> = {
  strong_support: 'border-border/60 bg-muted/15 text-muted-foreground',
  support: 'border-border/60 bg-muted/15 text-muted-foreground',
  acceptable: 'border-border/60 bg-muted/15 text-muted-foreground',
  concern: 'border-border/45 bg-muted/15 text-error',
};

export interface WorkbenchTeamStancePanelProps {
  tripId: string;
  /** 父级 React Query 缓存，避免重复 getCollaborators */
  collaborators?: Collaborator[] | null;
  collaboratorsLoading?: boolean;
  selectedOptionLetter?: string;
  selectedOption?: DecisionOption | null;
  personaAlerts?: PersonaAlert[];
  onOpenCollaboration?: () => void;
  className?: string;
}

function StanceCard({ card }: { card: TeamStanceCardView }) {
  if (card.kind === 'member' && card.members?.length) {
    return (
      <li
        className={cn(
          'flex flex-col self-start rounded-xl border border-border/60 bg-background/80 p-2.5',
        )}
      >
        <ul className="space-y-2">
          {card.members.map((member) => (
            <li key={member.collaborator.id} className="flex items-center gap-2">
              <CollaboratorAvatarFromRecord collaborator={member.collaborator} size="sm" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {member.collaborator.displayName?.trim() ||
                  member.collaborator.email?.trim() ||
                  '成员'}
              </span>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-[11px] font-normal', LEVEL_BADGE_CLASS[member.level])}
              >
                {member.levelLabel}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-2 text-[11px] leading-snug text-muted-foreground">{card.quote}</p>
      </li>
    );
  }

  return (
    <li
      className={cn(
        'flex flex-col self-start rounded-xl border border-border/60 bg-background/80 p-2.5',
      )}
    >
      <div className="flex items-start gap-2">
        {card.persona ? (
          <WorkbenchPersonaSymbol persona={card.persona} size={32} className="shrink-0" />
        ) : (
          <CollaboratorAvatarFromRecord
            collaborator={{ id: card.id, displayName: card.name } as Collaborator}
            size="sm"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-semibold text-foreground">{card.name}</span>
            <Badge
              variant="outline"
              className={cn('text-[11px] font-normal', LEVEL_BADGE_CLASS[card.level])}
            >
              {card.levelLabel}
            </Badge>
          </div>
        </div>
      </div>
      <p className="mt-auto pt-2 text-[11px] leading-snug text-muted-foreground">{card.quote}</p>
    </li>
  );
}

/** 团队立场（决策空间）— AI 三人格 + 真实协作者，横向卡片 */
export function WorkbenchTeamStancePanel({
  tripId,
  collaborators: collaboratorsProp,
  collaboratorsLoading = false,
  selectedOptionLetter = 'A',
  selectedOption,
  personaAlerts,
  onOpenCollaboration,
  className,
}: WorkbenchTeamStancePanelProps) {
  const [fetchedCollaborators, setFetchedCollaborators] = useState<Collaborator[]>([]);
  const [fetchLoading, setFetchLoading] = useState(collaboratorsProp === undefined);

  useEffect(() => {
    if (collaboratorsProp !== undefined) return;
    let cancelled = false;
    setFetchLoading(true);
    void tripsApi
      .getCollaborators(tripId)
      .then((data) => {
        if (!cancelled) setFetchedCollaborators(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFetchedCollaborators([]);
      })
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, collaboratorsProp]);

  const collaborators = collaboratorsProp ?? fetchedCollaborators;
  const loading = collaboratorsProp !== undefined ? collaboratorsLoading : fetchLoading;

  const cards = useMemo(
    () =>
      buildTeamStanceCards({
        collaborators,
        selectedOption,
        selectedOptionLetter,
        personaAlerts,
      }),
    [collaborators, selectedOption, selectedOptionLetter, personaAlerts],
  );

  if (loading) {
    return (
      <section className={cn(workbenchCard, 'p-3', className)}>
        <p className="text-[11px] text-muted-foreground">正在加载团队立场…</p>
      </section>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className={cn(workbenchCard, 'p-3', className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground">团队立场</h3>
        <span className="text-[11px] text-muted-foreground">（基于当前信息）</span>
        <span className="text-[11px] text-muted-foreground">· 方案 {selectedOptionLetter}</span>
        {onOpenCollaboration ? (
          <Button
            variant="link"
            className="ml-auto h-auto p-0 text-[11px]"
            onClick={onOpenCollaboration}
          >
            发起协商
          </Button>
        ) : null}
      </div>

      <ul
        className={cn(
          'grid gap-2',
          cards.length >= 4 ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
        )}
      >
        {cards.map((card) => (
          <StanceCard key={card.id} card={card} />
        ))}
      </ul>
    </section>
  );
}
