import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useAckChangeNotice,
  useParticipantChangeNotices,
} from '@/hooks/useParticipantPortal';
import { ChangeNoticeCard } from '../components/ChangeNoticeCard';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';

export default function ParticipantChangeNoticesPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { invite, phase } = useParticipantProject();
  const { data: notices, isLoading } = useParticipantChangeNotices(token);
  const ackNotice = useAckChangeNotice(token);

  if (!invite) return null;

  if (phase !== 'active') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  const handleAck = async (noticeId: string, helpRequested = false) => {
    try {
      await ackNotice.mutateAsync({ noticeId, body: { helpRequested } });
      toast.success(helpRequested ? '已请求协助' : '已确认收到');
    } catch (e) {
      const guide = resolveParticipantPortalErrorGuide(e);
      toast.error(guide.description);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">行中变化</CardTitle>
          <CardDescription>仅展示与本人相关且可能需要行动的变化通知。</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !notices?.length ? (
            <p className="text-sm text-muted-foreground">当前没有需要处理的变化通知。</p>
          ) : (
            <ul className="space-y-3">
              {notices.map((notice) => (
                <li key={notice.id}>
                  <ChangeNoticeCard
                    notice={notice}
                    detailHref={participantProjectPath(token, `changes/${notice.id}`)}
                    onAck={(helpRequested) => void handleAck(notice.id, helpRequested)}
                    ackPending={ackNotice.isPending}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full" onClick={() => navigate(participantProjectPath(token, 'dashboard'))}>
        返回首页
      </Button>
    </div>
  );
}
