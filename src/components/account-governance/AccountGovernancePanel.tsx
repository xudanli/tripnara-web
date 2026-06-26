import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  Megaphone,
  Shield,
  UserCircle2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { cn } from '@/lib/utils';
import {
  accountContextLabel,
  canPublishPublicRecruitment,
  hasActiveVerification,
  isVerificationActive,
  agencyCertificationStatusLabel,
  professionalCertificationStatusLabel,
  isProfessionalCertificationPending,
  publishingBlockReason,
  publishingLevelLabel,
  resolveAgencyCertificationStatus,
  resolveProfessionalCertificationStatus,
  subscriptionPlanLabel,
  subscriptionStatusLabel,
  projectRoleLabel,
  organizationRoleLabel,
  organizationMemberStatusLabel,
  verificationStatusLabel,
  verificationTypeLabel,
} from '@/lib/account-governance';
import type { AccountCapabilities, VerificationType } from '@/types/account-governance';
import { PublishingPermissionApplyDialog } from './PublishingPermissionApplyDialog';

const CORE_VERIFICATION_TYPES: VerificationType[] = [
  'PHONE',
  'EMAIL',
  'REAL_NAME',
  'AGE',
];

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'VERIFIED') return 'default';
  if (status === 'PENDING' || status === 'NEED_MORE_INFO') return 'secondary';
  if (status === 'REJECTED' || status === 'SUSPENDED' || status === 'REVOKED') return 'destructive';
  return 'outline';
}

interface AccountGovernancePanelProps {
  capabilities?: AccountCapabilities | null;
  isLoading?: boolean;
  className?: string;
}

/** PRD §14.1 · 身份验证、角色、订阅与发布权限（R0 只读 + 申请引导） */
export function AccountGovernancePanel({
  capabilities,
  isLoading,
  className,
}: AccountGovernancePanelProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-12">
          <LogoLoading size={36} />
        </CardContent>
      </Card>
    );
  }

  const caps = capabilities;
  const verifications = caps?.verifications ?? [];
  const verificationByType = new Map(verifications.map((v) => [v.type, v]));
  const publishing = caps?.publishingPermission ?? null;
  const canPublish = canPublishPublicRecruitment(publishing, {
    professionalVerified: caps?.professionalVerified,
    agencyVerified: caps?.agencyVerified,
  });
  const professionalStatus = resolveProfessionalCertificationStatus(caps);
  const agencyStatus = resolveAgencyCertificationStatus(caps);
  const primarySubscription = caps?.subscriptions?.[0];

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            身份验证
          </CardTitle>
          <CardDescription>
            实名与联系方式相互独立；身份真实不代表具备领队资格或项目适合度。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CORE_VERIFICATION_TYPES.map((type) => {
            const record = verificationByType.get(type);
            const status = record?.status ?? 'NOT_STARTED';
            const active = record ? isVerificationActive(record) : false;
            return (
              <div
                key={type}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
              >
                <span className="text-sm font-medium">{verificationTypeLabel(type)}</span>
                <Badge variant={statusBadgeVariant(status)}>
                  {active ? '已验证' : verificationStatusLabel(status)}
                </Badge>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            申请公开项目、专业认证或机构入驻时，将按需追加验证材料。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            我的角色
          </CardTitle>
          <CardDescription>
            当前上下文：{accountContextLabel(caps?.activeContext ?? { type: 'personal' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              项目角色
            </p>
            {caps?.projectRoles?.length ? (
              <ul className="space-y-2">
                {caps.projectRoles.map((membership) => (
                  <li
                    key={membership.projectId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{membership.projectTitle ?? membership.projectId}</span>
                    <span className="text-xs text-muted-foreground">
                      {membership.roles.map(projectRoleLabel).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                创建私人项目后自动成为该项目的组织者；项目结束后角色历史保留。
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              机构角色
            </p>
            {caps?.organizationRoles?.length ? (
              <ul className="space-y-2">
                {caps.organizationRoles.map((membership) => (
                  <li
                    key={membership.organizationId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{membership.organizationName ?? membership.organizationId}</span>
                    <span className="text-xs text-muted-foreground">
                      {membership.roles.map(organizationRoleLabel).join(' · ')} ·{' '}
                      {organizationMemberStatusLabel(membership.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">尚未加入机构空间。</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>专业领队：</span>
              <Badge variant={professionalStatus === 'VERIFIED' ? 'default' : 'outline'}>
                {professionalCertificationStatusLabel(professionalStatus)}
              </Badge>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>机构认证：</span>
              <Badge variant={agencyStatus === 'VERIFIED' ? 'default' : 'outline'}>
                {caps?.agencyVerified
                  ? '已认证'
                  : agencyStatus === 'SUBMITTED'
                    ? agencyCertificationStatusLabel(agencyStatus)
                    : '未认证'}
              </Badge>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/account/professional">申请专业领队认证</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/account/agency">创建 / 管理机构空间</Link>
            </Button>
            {isProfessionalCertificationPending(professionalStatus) && !caps?.professionalVerified && (
              <p className="w-full text-xs leading-relaxed text-muted-foreground">
                专业认证已提交，平台审核通过后才会更新发布权限；「已提交」不等于「已认证」。
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              订阅与权益
            </CardTitle>
            <CardDescription>订阅仅解锁工具能力，不替代专业认证。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {primarySubscription
                ? subscriptionPlanLabel(primarySubscription.plan)
                : '免费版'}
            </p>
            {primarySubscription && (
              <p className="mt-1 text-xs text-muted-foreground">
                状态：{subscriptionStatusLabel(primarySubscription.status)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              发布权限
            </CardTitle>
            <CardDescription>公开发布需认证 + 权限 + 项目审核。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {publishing ? publishingLevelLabel(publishing.level) : '仅私人项目'}
              </span>
              <Badge variant={canPublish ? 'default' : 'outline'}>
                {canPublish ? '可公开招募' : '不可公开招募'}
              </Badge>
            </div>
            {!canPublish && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {publishingBlockReason(publishing)}
                {import.meta.env.DEV && import.meta.env.VITE_DEV_SIMULATE_PUBLISH !== '1' && (
                  <span className="mt-1 block text-amber-700 dark:text-amber-400">
                    开发环境：身份治理接口未就绪时会使用本地占位数据（默认无公开发布权限）。本地联调可在环境变量中开启模拟发布权限。
                  </span>
                )}
              </p>
            )}
            {!canPublish && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/account/professional">了解专业认证</Link>
                </Button>
                <PublishingPermissionApplyDialog capabilities={caps} />
              </div>
            )}
            {canPublish && publishing?.level !== 'PUBLIC_COMMERCIAL' && (
              <PublishingPermissionApplyDialog
                capabilities={caps}
                trigger={
                  <Button variant="outline" size="sm">
                    升级发布权限
                  </Button>
                }
              />
            )}
            {caps?.professionalVerified && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserCircle2 className="h-3.5 w-3.5" />
                已通过专业领队认证
              </p>
            )}
            {caps?.agencyVerified && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                已通过机构认证
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">学历 / 职业验证材料</p>
            <p className="mt-1 text-xs text-muted-foreground">
              在个人主页身份中心管理学历与职业验证；专业资质见下方链接。
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/profile">身份中心</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/profile#qualifications">管理资质</Link>
          </Button>
        </CardContent>
      </Card>

      {caps && !hasActiveVerification(caps.verifications, 'EMAIL') && !hasActiveVerification(caps.verifications, 'PHONE') && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          建议先完成邮箱或手机验证，以便申请加入项目。
        </p>
      )}

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">项目适合度申诉管理</p>
            <p className="mt-1 text-xs text-muted-foreground">
              平台运营 · 分诊与结案项目适合度申诉（需管理员权限）。
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/admin/project-fit/appeals">适合度申诉</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/admin/reputation/disputes">声誉争议</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
