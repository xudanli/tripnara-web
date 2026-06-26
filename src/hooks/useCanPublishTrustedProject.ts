import { useMemo } from 'react';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { canPublishPublicRecruitment, publishingBlockReason } from '@/lib/account-governance';

/** 是否具备公开发布可信项目的权限（Professional/Agency 认证 + 发布权限） */
export function useCanPublishTrustedProject() {
  const { data: caps, isLoading, isError } = useAccountCapabilities();

  const canPublish = useMemo(
    () =>
      canPublishPublicRecruitment(caps?.publishingPermission, {
        professionalVerified: caps?.professionalVerified,
        agencyVerified: caps?.agencyVerified,
      }),
    [caps]
  );

  const blockReason = useMemo(
    () => publishingBlockReason(caps?.publishingPermission ?? null),
    [caps]
  );

  return { canPublish, isLoading, isError, caps, blockReason };
}
