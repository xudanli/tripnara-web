import type { RecruitmentPostCard } from '@/types/match-square';
import { resolveCaptainCredentials } from '../lib/verified-credentials';
import { CredentialsHeadlineStrip } from './CredentialsHeadlineStrip';

interface VerifiedCredentialsStripProps {
  post: RecruitmentPostCard;
  variant?: 'list' | 'detail';
  compact?: boolean;
  onOpenTrustProfile?: () => void;
  className?: string;
}

/** PRD 3.1.2 · verifiedCredentials.headline 列表外显 */
export function VerifiedCredentialsStrip({
  post,
  variant = 'list',
  compact = false,
  onOpenTrustProfile,
  className,
}: VerifiedCredentialsStripProps) {
  const credentials = resolveCaptainCredentials(post);
  if (!credentials?.headline?.identityHeadline) return null;

  return (
    <CredentialsHeadlineStrip
      credentials={credentials}
      variant={variant}
      compact={compact}
      onOpenTrustProfile={onOpenTrustProfile}
      className={className}
    />
  );
}
