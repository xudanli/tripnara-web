import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdvisorTripInviteCodesPanel } from '@/components/advisor-trip-create/AdvisorTripInviteCodesPanel';
import { tripMemberInvitesApi } from '@/api/trip-member-invites';
import { isAdvisorLedTrip } from '@/lib/trip-collaboration-mode.util';
import { mergeInviteCodeLists } from '@/lib/trip-member-invite-codes.util';
import { collabPageStack } from '../collab-dashboard-layout';
import { cn } from '@/lib/utils';
import type { AdvisorTripMemberInviteCode } from '@/types/advisor-trip-create';
import type { TripDetail } from '@/types/trip';

interface CollabCenterRoleInvitesTabProps {
  tripId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
  className?: string;
}

/** 顾问制角色邀请 / 自由行同行成员邀请（metadata.memberInviteCodes ∪ 本地缓存） */
export function CollabCenterRoleInvitesTab({
  tripId,
  trip,
  onTripRefetch,
  className,
}: CollabCenterRoleInvitesTabProps) {
  const advisorLed = isAdvisorLedTrip(trip);
  const meta = (trip as { metadata?: Record<string, unknown> | null }).metadata;
  const fromTrip = useMemo(
    () => tripMemberInvitesApi.listForTrip(tripId, meta),
    [tripId, meta],
  );
  const [extraCodes, setExtraCodes] = useState<AdvisorTripMemberInviteCode[]>([]);
  const [generating, setGenerating] = useState(false);

  const inviteCodes = useMemo(
    () => mergeInviteCodeLists(fromTrip, extraCodes),
    [fromTrip, extraCodes],
  );

  const handleGenerate = useCallback(
    async (count = 1) => {
      setGenerating(true);
      try {
        const result = await tripMemberInvitesApi.createForTrip(tripId, {
          count,
          labelPrefix: '同行成员',
        });
        setExtraCodes((prev) => mergeInviteCodeLists(prev, result.created));
        toast.success(`已生成 ${result.created.length} 条邀请链接`);
        await onTripRefetch?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '生成邀请失败');
      } finally {
        setGenerating(false);
      }
    },
    [tripId, onTripRefetch],
  );

  return (
    <div className={cn(collabPageStack, className)}>
      <AdvisorTripInviteCodesPanel
        inviteCodes={inviteCodes}
        tripId={tripId}
        variant="manage"
        allowGenerate
        generating={generating}
        onGenerate={handleGenerate}
        title={advisorLed ? '角色邀请码' : '同行成员邀请'}
        description={
          advisorLed
            ? '按角色将邀请链接或邀请码发送给干系人；接受后需完成成员偏好采集。邀请码通常 14 天内有效。'
            : '为每位同行生成独立邀请链接；对方通过链接加入后需完成行前需求问卷，进度可在「团队与需求」查看。'
        }
      />
    </div>
  );
}
