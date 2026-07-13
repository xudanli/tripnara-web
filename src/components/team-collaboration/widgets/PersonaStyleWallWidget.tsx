import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { personaFooterLinkClass } from '@/components/team-collaboration/persona-ui';
import type { TeamTravelStyleItem } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';
import { MemberPersonaCardsWidget } from './MemberPersonaCardsWidget';

interface PersonaStyleWallWidgetProps {
  members: TeamTravelStyleItem[];
  loading?: boolean;
  onOpenQuiz?: () => void;
  className?: string;
}

export function PersonaStyleWallWidget({
  members,
  loading,
  onOpenQuiz,
  className,
}: PersonaStyleWallWidgetProps) {
  return (
    <CollabWidgetCard
      title="旅行风格 · 团队风格墙"
      description="基于决策风格测评（Travel Style）的协作人格摘要；行前需求问卷请在「团队与需求」查看。"
      compact
      className={className}
      footer={
        onOpenQuiz ? (
          <Button
            type="button"
            variant="link"
            className={cn(personaFooterLinkClass, 'h-auto p-0')}
            onClick={onOpenQuiz}
          >
            {members.length > 0 ? '查看风格解读 / 重新测评' : '开始决策风格测评'}
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      <MemberPersonaCardsWidget members={members} loading={loading} columns={2} />
    </CollabWidgetCard>
  );
}
