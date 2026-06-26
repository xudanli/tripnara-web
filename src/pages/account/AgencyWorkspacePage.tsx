import { Link } from 'react-router-dom';
import { Building2, FileText, Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import {
  agencyCertificationStatusLabel,
  publishingBlockReason,
  resolveAgencyCertificationStatus,
} from '@/lib/account-governance';
import { readAgencyCertificationDraft } from '@/lib/agency-certification-draft';

const AGENCY_ROLES = [
  { role: 'Owner', desc: '组织所有权、认证提交、管理员任命' },
  { role: 'Agency Admin', desc: '成员、角色、项目与权限管理' },
  { role: 'Advisor', desc: '客户项目、冲突与决策记录（授权范围内）' },
  { role: 'Leader', desc: '负责公开/商业项目（需个人认证）' },
  { role: 'Operations', desc: '履约、Readiness、Plan B、事件记录' },
  { role: 'Finance', desc: '价格、合同、支付与退款（不默认访问私密偏好）' },
] as const;

/** PRD §10 · Agency 企业入驻（R1） */
export default function AgencyWorkspacePage() {
  const { data: capabilities } = useAccountCapabilities();
  const status = resolveAgencyCertificationStatus(capabilities);
  const verified = capabilities?.agencyVerified === true || status === 'VERIFIED';
  const memberships = capabilities?.organizationRoles ?? [];
  const localDraft = readAgencyCertificationDraft();
  const hasDraft = Boolean(
    localDraft &&
      (localDraft.workspaceName ||
        localDraft.entity.legalName ||
        localDraft.status === 'SUBMITTED')
  );

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/settings?tab=governance"
          title="Agency 机构空间"
          subtitle="企业认证、成员协作与商业责任主体"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              企业认证
              <Badge variant={verified ? 'default' : 'secondary'}>
                {verified ? '已认证' : hasDraft ? agencyCertificationStatusLabel(status) : '未认证'}
              </Badge>
            </CardTitle>
            <CardDescription>
              认证通过前仅可配置草稿资料；不得以认证机构名义公开发布或商业收费。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Agency 认证回答的是：出现商业和履约问题时，谁承担责任。它不能被个人芝麻信用替代。
            </p>
            {!verified && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-foreground">
                可
                <Link to="/dashboard/account/agency/apply" className="mx-1 underline">
                  填写机构认证申请
                </Link>
                ；成员邀请与组织空间管理将在认证试点阶段逐步开放。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              企业认证材料
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>· 主体信息：企业名称、统一社会信用代码、营业执照</p>
            <p>· 授权信息：法定代表人或授权操作人</p>
            <p>· 经营与服务：旅行经营资质、服务范围</p>
            <p>· 资金与责任：收款主体、退款政策、保险与投诉机制</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              组织角色
            </CardTitle>
            <CardDescription>成员邀请须被邀请人主动接受</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberships.length > 0 && (
              <ul className="mb-4 space-y-2">
                {memberships.map((m) => (
                  <li
                    key={m.organizationId}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    {m.organizationName ?? m.organizationId} · {m.roles.join(', ')}
                  </li>
                ))}
              </ul>
            )}
            <ul className="space-y-2 text-sm text-muted-foreground">
              {AGENCY_ROLES.map(({ role, desc }) => (
                <li key={role}>
                  <span className="font-medium text-foreground">{role}</span> — {desc}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              发布权限
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{publishingBlockReason(capabilities?.publishingPermission ?? null)}</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <Link to="/dashboard/advisor">顾问工作台</Link>
          </Button>
          {!verified && (
            <Button asChild>
              <Link to="/dashboard/account/agency/apply">
                {hasDraft && status === 'DRAFT' ? '继续填写申请' : status === 'SUBMITTED' ? '查看申请' : '开始机构认证'}
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard/settings?tab=governance">返回身份与权限</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
