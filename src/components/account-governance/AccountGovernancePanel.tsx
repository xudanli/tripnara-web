import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Lightbulb,
  Mail,
  Megaphone,
  Phone,
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

const VERIFICATION_ICONS: Record<
  (typeof CORE_VERIFICATION_TYPES)[number],
  typeof Phone
> = {
  PHONE: Phone,
  EMAIL: Mail,
  REAL_NAME: UserCircle2,
  AGE: Calendar,
};

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'VERIFIED') return 'default';
  if (status === 'PENDING' || status === 'NEED_MORE_INFO') return 'secondary';
  if (status === 'REJECTED' || status === 'SUSPENDED' || status === 'REVOKED') return 'destructive';
  return 'outline';
}

function verificationSecondaryText(
  type: VerificationType,
  active: boolean,
  status: string
): string {
  if (active) return '已完成验证';
  if (status === 'NOT_STARTED' && type === 'AGE') return '未填写';
  if (status === 'NOT_STARTED') return '未绑定';
  return verificationStatusLabel(status);
}

interface AccountGovernancePanelProps {
  capabilities?: AccountCapabilities | null;
  isLoading?: boolean;
  className?: string;
  layout?: 'stack' | 'settings-grid';
}

/** PRD §14.1 · 身份验证、角色、订阅与发布权限（R0 只读 + 申请引导） */
export function AccountGovernancePanel({
  capabilities,
  isLoading,
  className,
  layout = 'stack',
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
  const isSettingsGrid = layout === 'settings-grid';

  const verificationCard = (
    <Card className={cn(isSettingsGrid && 'flex h-full flex-col')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          身份验证
        </CardTitle>
        <CardDescription>
          实名与联系方式相互独立；身份真实不代表具备领队资格或项目适合度。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-2">
          {CORE_VERIFICATION_TYPES.map((type) => {
            const record = verificationByType.get(type);
            const status = record?.status ?? 'NOT_STARTED';
            const active = record ? isVerificationActive(record) : false;
            const Icon = VERIFICATION_ICONS[type];
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{verificationTypeLabel(type)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {verificationSecondaryText(type, active, status)}
                  </p>
                </div>
                <Badge
                  variant={statusBadgeVariant(status)}
                  className={cn(
                    'shrink-0',
                    active && 'bg-emerald-600 hover:bg-emerald-600/90'
                  )}
                >
                  {active ? '已验证' : verificationStatusLabel(status)}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3 py-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">小贴士</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              申请公开项目、专业认证或机构入驻时，将按需追加验证材料。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const rolesCard = (
    <Card className={cn(isSettingsGrid && 'flex h-full flex-col')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          我的角色
        </CardTitle>
        <CardDescription>
          当前上下文：{accountContextLabel(caps?.activeContext ?? { type: 'personal' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">项目角色</p>
          {caps?.projectRoles?.length ? (
            <ul className="space-y-2">
              {caps.projectRoles.map((membership) => (
                <li
                  key={membership.projectId}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {membership.projectTitle ?? membership.projectId}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {membership.roles.map(projectRoleLabel).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              创建私人项目后自动成为该项目的组织者；项目结束后角色历史保留。
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">机构角色</p>
          {caps?.organizationRoles?.length ? (
            <ul className="space-y-2">
              {caps.organizationRoles.map((membership) => (
                <li key={membership.organizationId}>
                  <Link
                    to="/dashboard/account/agency"
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {membership.organizationName ?? membership.organizationId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {membership.roles.map(organizationRoleLabel).join(' · ')} ·{' '}
                        {organizationMemberStatusLabel(membership.status)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              尚未加入机构空间。
            </p>
          )}
        </div>

        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2
                className={cn(
                  'h-3.5 w-3.5',
                  professionalStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-muted-foreground/50'
                )}
              />
              专业领队：
              <span
                className={cn(
                  'font-medium',
                  professionalStatus === 'VERIFIED' ? 'text-emerald-700' : 'text-foreground'
                )}
              >
                {professionalCertificationStatusLabel(professionalStatus)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2
                className={cn(
                  'h-3.5 w-3.5',
                  caps?.agencyVerified ? 'text-emerald-600' : 'text-muted-foreground/50'
                )}
              />
              机构认证：
              <span
                className={cn(
                  'font-medium',
                  caps?.agencyVerified ? 'text-emerald-700' : 'text-foreground'
                )}
              >
                {caps?.agencyVerified
                  ? '已认证'
                  : agencyStatus === 'SUBMITTED'
                    ? agencyCertificationStatusLabel(agencyStatus)
                    : '未认证'}
              </span>
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <Link to="/dashboard/account/professional">申请专业领队认证</Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/dashboard/account/agency">创建 / 管理机构空间</Link>
            </Button>
          </div>

          {isProfessionalCertificationPending(professionalStatus) && !caps?.professionalVerified && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              专业认证已提交，平台审核通过后才会更新发布权限；「已提交」不等于「已认证」。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const subscriptionCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4 text-primary" />
          订阅与权益
        </CardTitle>
        <CardDescription>订阅仅解锁工具能力，不替代专业认证。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BadgeCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {primarySubscription
                ? subscriptionPlanLabel(primarySubscription.plan)
                : '免费版'}
            </p>
            {primarySubscription && (
              <p className="text-xs text-muted-foreground">
                {subscriptionStatusLabel(primarySubscription.status)}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const publishingCard = (
    <Card className={cn(isSettingsGrid && 'flex flex-1 flex-col')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-primary" />
          发布权限
        </CardTitle>
        <CardDescription>公开发布需认证 + 权限 + 项目审核。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {publishing ? publishingLevelLabel(publishing.level) : '仅私人项目'}
          </p>
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
        </div>

        <div
          className={cn(
            'rounded-xl px-3 py-2.5 text-center text-sm font-medium',
            canPublish
              ? 'bg-foreground text-background'
              : 'border border-border bg-muted/40 text-muted-foreground'
          )}
        >
          {canPublish ? '可公开招募' : '不可公开招募'}
        </div>

        {!canPublish && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/dashboard/account/professional">了解专业认证</Link>
            </Button>
            <PublishingPermissionApplyDialog
              capabilities={caps}
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  申请发布权限
                </Button>
              }
            />
          </div>
        )}

        {canPublish && publishing?.level !== 'PUBLIC_COMMERCIAL' && (
          <PublishingPermissionApplyDialog
            capabilities={caps}
            trigger={
              <Button variant="outline" size="sm" className="w-full">
                升级发布权限
              </Button>
            }
          />
        )}

        <div className="space-y-1.5 pt-1">
          {caps?.professionalVerified && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              已通过专业领队认证
            </p>
          )}
          {caps?.agencyVerified && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              已通过机构认证
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const verificationHint = caps && !hasActiveVerification(caps.verifications, 'EMAIL') && !hasActiveVerification(caps.verifications, 'PHONE') && (
    <p className="text-xs text-amber-700 dark:text-amber-400">
      建议先完成邮箱或手机验证，以便申请加入项目。
    </p>
  );

  const statusBar = isSettingsGrid && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">认证状态总览</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
          <Shield className="h-3.5 w-3.5 text-primary" />
          专业领队：{professionalCertificationStatusLabel(professionalStatus)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          机构认证：
          {caps?.agencyVerified ? '已认证' : agencyCertificationStatusLabel(agencyStatus)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
          <Megaphone className="h-3.5 w-3.5 text-primary" />
          发布：{canPublish ? '可公开招募' : '不可公开招募'}
        </span>
      </div>
    </div>
  );

  if (isSettingsGrid) {
    return (
      <div className={cn('space-y-5', className)}>
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col">{verificationCard}</div>
          <div className="flex min-h-0 flex-col">{rolesCard}</div>
          <div className="flex min-h-0 flex-col gap-5">
            {subscriptionCard}
            {publishingCard}
          </div>
        </div>
        {statusBar}
        {verificationHint}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {verificationCard}
      {rolesCard}

      <div className="grid gap-6 md:grid-cols-2">
        {subscriptionCard}
        {publishingCard}
      </div>

      {verificationHint}
    </div>
  );
}
