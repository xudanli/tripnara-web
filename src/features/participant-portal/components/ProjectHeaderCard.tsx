import { MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { gate1ParticipantStatusLabel } from '@/lib/gate1-display';
import type { ParticipantInviteLanding } from '@/types/participant-portal';
import { mapParticipantStatusToPhase, portalPhaseLabel } from '../shell/participant-phase';

interface ProjectHeaderCardProps {
  invite: ParticipantInviteLanding;
}

export function ProjectHeaderCard({ invite }: ProjectHeaderCardProps) {
  const phase = mapParticipantStatusToPhase(invite.participant.status);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div>
          <p className="text-xs text-muted-foreground">您好，{invite.participant.displayName}</p>
          <h1 className="mt-1 text-lg font-semibold leading-snug">{invite.project.title}</h1>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {invite.project.destination}
          </span>
          {invite.project.dateRange?.start ? (
            <span>
              {invite.project.dateRange.start}
              {invite.project.dateRange.end ? ` – ${invite.project.dateRange.end}` : ''}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {portalPhaseLabel(phase)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          状态：{gate1ParticipantStatusLabel(invite.participant.status)}
        </p>
      </CardContent>
    </Card>
  );
}
