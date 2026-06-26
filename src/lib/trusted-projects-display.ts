import type {
  TrustedProjectCommercialType,
  TrustedProjectListing,
  TrustedProjectListingStatus,
} from '@/types/trusted-projects';

const LISTING_STATUS_LABELS: Record<TrustedProjectListingStatus, string> = {
  draft: '草稿',
  pending_review: '审核中',
  published: '已发布',
  closed: '已关闭',
  suspended: '已暂停',
};

const COMMERCIAL_TYPE_LABELS: Record<TrustedProjectCommercialType, string> = {
  NON_COMMERCIAL: '非商业',
  COMMERCIAL: '商业',
};

export function trustedProjectStatusLabel(status: TrustedProjectListingStatus): string {
  return LISTING_STATUS_LABELS[status] ?? status;
}

export function trustedProjectCommercialLabel(type: TrustedProjectCommercialType): string {
  return COMMERCIAL_TYPE_LABELS[type] ?? type;
}

export function formatTrustedProjectBudget(
  minCents?: number | null,
  maxCents?: number | null,
  currency = 'CNY'
): string {
  if (minCents == null && maxCents == null) return '面议';
  const fmt = (cents: number) =>
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(cents / 100);
  if (minCents != null && maxCents != null) return `${fmt(minCents)} – ${fmt(maxCents)}`;
  if (minCents != null) return `自 ${fmt(minCents)}`;
  return `最高 ${fmt(maxCents!)}`;
}

export function trustedProjectPublisherLabel(project: TrustedProjectListing): string | null {
  if (project.publisherDisplayName?.trim()) {
    return project.publisherDisplayName.trim();
  }
  return null;
}

/** 从项目列表/详情 basePath 推导信任档案路由前缀（Dashboard 或公开站） */
export function resolveTrustProfileBasePath(listingBasePath: string): string {
  if (listingBasePath.startsWith('/dashboard')) {
    return '/dashboard';
  }
  return '';
}

function buildTrustProfilePath(
  trustBasePath: string,
  segment: 'users' | 'organizations',
  subjectId: string
): string {
  const root = trustBasePath.replace(/\/$/, '');
  return root
    ? `${root}/trust/${segment}/${subjectId}`
    : `/trust/${segment}/${subjectId}`;
}

export function trustedProjectPublisherTrustPath(
  project: TrustedProjectListing,
  trustBasePath = '/dashboard'
): string | null {
  if (project.publisherSubjectType === 'ORGANIZATION') {
    const organizationId = project.publisherSubjectId ?? project.organizationId;
    if (!organizationId) {
      return null;
    }
    return buildTrustProfilePath(trustBasePath, 'organizations', organizationId);
  }

  const userId = project.publisherSubjectId ?? project.responsibleUserId;
  if (!userId) {
    return null;
  }
  return buildTrustProfilePath(trustBasePath, 'users', userId);
}

export function trustedProjectResponsibleUserTrustPath(
  project: TrustedProjectListing,
  trustBasePath = '/dashboard'
): string | null {
  if (!project.responsibleUserId) {
    return null;
  }
  return buildTrustProfilePath(trustBasePath, 'users', project.responsibleUserId);
}
