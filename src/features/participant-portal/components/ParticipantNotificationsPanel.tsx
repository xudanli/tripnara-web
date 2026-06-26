import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Link } from 'react-router-dom';
import { useParticipantNotifications } from '@/hooks/useParticipantPortal';
import { participantProjectPath } from '../shell/participant-phase';

interface ParticipantNotificationsPanelProps {
  token: string;
  limit?: number;
}

export function ParticipantNotificationsPanel({
  token,
  limit = 5,
}: ParticipantNotificationsPanelProps) {
  const { data: notifications, isLoading } = useParticipantNotifications(token);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!notifications?.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">应用内通知</CardTitle>
        {notifications.length > limit ? (
          <Link
            to={participantProjectPath(token, 'notifications')}
            className="text-xs text-primary hover:underline"
          >
            查看全部
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.slice(0, limit).map((n) => (
          <div key={n.id} className="rounded-md border px-3 py-2 text-sm">
            <p className="font-medium">{n.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
            {n.sentAt ? (
              <p className="mt-1 text-[10px] text-muted-foreground">{n.sentAt}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
