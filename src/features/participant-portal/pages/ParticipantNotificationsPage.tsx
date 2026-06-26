import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useParticipantNotifications } from '@/hooks/useParticipantPortal';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { portalPathForPhase } from '../shell/participant-phase';

export default function ParticipantNotificationsPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { invite, phase } = useParticipantProject();
  const { data: notifications, isLoading } = useParticipantNotifications(token);

  if (!invite) return null;

  if (phase !== 'active') {
    return <Navigate to={portalPathForPhase(token, phase)} replace />;
  }

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">应用内通知</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !notifications?.length ? (
            <p className="text-sm text-muted-foreground">暂无通知</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="rounded-md border px-3 py-3 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {n.eventType} · {n.sentAt ?? n.createdAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
