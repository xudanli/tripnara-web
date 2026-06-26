import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useAckChangeNotice,
  useParticipantChangeNotice,
} from '@/hooks/useParticipantPortal';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';
import { ChangeNoticeCard } from '../components/ChangeNoticeCard';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';

export default function ParticipantChangeNoticeDetailPage() {
  const { token = '', noticeId = '' } = useParams<{ token: string; noticeId: string }>();
  const navigate = useNavigate();
  const { invite, phase } = useParticipantProject();
  const { data: notice, isLoading, isError } = useParticipantChangeNotice(token, noticeId);
  const ackNotice = useAckChangeNotice(token);

  if (!invite) return null;

  if (phase !== 'active') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  const handleAck = async (helpRequested = false) => {
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

      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1"
        onClick={() => navigate(participantProjectPath(token, 'changes'))}
      >
        <ArrowLeft className="h-4 w-4" />
        返回变化列表
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError || !notice ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            无法加载该变化通知，可能已被撤回或链接无效。
          </CardContent>
        </Card>
      ) : (
        <ChangeNoticeCard
          notice={notice}
          onAck={(helpRequested) => void handleAck(helpRequested)}
          ackPending={ackNotice.isPending}
        />
      )}
    </div>
  );
}
