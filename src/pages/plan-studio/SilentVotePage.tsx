import { useNavigate, useParams } from 'react-router-dom';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import { SilentVoteDialog } from '@/components/silent-vote';

/** 深链入口：以弹窗形式展示投票详情，关闭后返回规划工作台 */
export default function SilentVotePage() {
  const { tripId, voteId } = useParams<{ tripId: string; voteId: string }>();
  const navigate = useNavigate();

  const backToPlanStudio = () => {
    if (!tripId) {
      navigate(-1);
      return;
    }
    navigate(buildCollabCenterPlanStudioUrl(tripId, { collabTab: 'decisions' }));
  };

  if (!tripId || !voteId) {
    return null;
  }

  return (
    <SilentVoteDialog
      tripId={tripId}
      voteId={voteId}
      open
      onOpenChange={(open) => {
        if (!open) backToPlanStudio();
      }}
    />
  );
}
