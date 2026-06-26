import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveTrustProfileBasePath,
  trustedProjectPublisherLabel,
  trustedProjectPublisherTrustPath,
  trustedProjectResponsibleUserTrustPath,
} from '@/lib/trusted-projects-display';
import type { TrustedProjectListing } from '@/types/trusted-projects';

interface TrustedProjectPublisherLinkProps {
  project: TrustedProjectListing;
  /** 与列表/详情页一致的 basePath，用于推导 /dashboard 或公开站信任档案路由 */
  listingBasePath?: string;
  className?: string;
  showIcon?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function TrustedProjectPublisherLink({
  project,
  listingBasePath = '/dashboard/trusted-projects',
  className,
  showIcon = true,
  onClick,
}: TrustedProjectPublisherLinkProps) {
  const label = trustedProjectPublisherLabel(project);
  const trustBasePath = resolveTrustProfileBasePath(listingBasePath);
  const href = trustedProjectPublisherTrustPath(project, trustBasePath);
  const PublisherIcon = project.publisherSubjectType === 'ORGANIZATION' ? Building2 : UserRound;

  if (!label) {
    return null;
  }

  const content = (
    <>
      {showIcon && <PublisherIcon className="h-3 w-3 shrink-0" />}
      {label}
    </>
  );

  if (!href) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline',
        className
      )}
      onClick={onClick}
    >
      {content}
    </Link>
  );
}

interface TrustedProjectResponsibleUserLinkProps {
  project: TrustedProjectListing;
  listingBasePath?: string;
  className?: string;
  prefix?: string;
}

export function TrustedProjectResponsibleUserLink({
  project,
  listingBasePath = '/dashboard/trusted-projects',
  className,
  prefix = '负责人 ',
}: TrustedProjectResponsibleUserLinkProps) {
  const name = project.responsibleUserDisplayName?.trim();
  if (!name) {
    return null;
  }

  const trustBasePath = resolveTrustProfileBasePath(listingBasePath);
  const href = trustedProjectResponsibleUserTrustPath(project, trustBasePath);

  if (!href) {
    return <span className={className}>{prefix}{name}</span>;
  }

  return (
    <Link
      to={href}
      className={cn('font-medium text-primary underline-offset-2 hover:underline', className)}
    >
      {prefix}{name}
    </Link>
  );
}
