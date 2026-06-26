import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildTrekRecruitmentUrl,
  inferActivityProfileFromTrail,
  resolveTrekVisionSeed,
  type TrekActivityProfile,
} from '@/features/match-square/lib/trek-plaza-bridge';
import { useCanPublishTrustedProject } from '@/hooks/useCanPublishTrustedProject';

type StartTrekRecruitmentButtonProps = {
  routeDirectionId: number;
  nameCN?: string;
  routeDirectionName?: string;
  tags?: string[];
  activityProfile?: TrekActivityProfile;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
};

export function StartTrekRecruitmentButton({
  routeDirectionId,
  nameCN,
  routeDirectionName,
  tags,
  activityProfile: activityProfileProp,
  className,
  size = 'lg',
  variant = 'secondary',
}: StartTrekRecruitmentButtonProps) {
  const navigate = useNavigate();
  const { canPublish, isLoading } = useCanPublishTrustedProject();

  const activityProfile =
    activityProfileProp ??
    inferActivityProfileFromTrail({
      nameCN,
      routeDirectionName,
      tags,
    }) ??
    undefined;

  if (isLoading || !canPublish) {
    return null;
  }

  const handleClick = () => {
    const vibeSeed = activityProfile ? resolveTrekVisionSeed(activityProfile) : undefined;
    navigate(
      buildTrekRecruitmentUrl({
        routeDirectionId,
        routeDirectionName: routeDirectionName ?? nameCN,
        activityProfile,
        vibeSeed,
      })
    );
  };

  return (
    <Button className={className} size={size} variant={variant} onClick={handleClick}>
      <Users className="h-4 w-4 mr-2" />
      发起徒步组队
    </Button>
  );
}
