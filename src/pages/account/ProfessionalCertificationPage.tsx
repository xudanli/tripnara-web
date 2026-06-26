import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  Circle,
  FileText,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import {
  professionalCertificationStatusLabel,
  publishingBlockReason,
  resolveProfessionalCertificationStatus,
} from '@/lib/account-governance';
import { cn } from '@/lib/utils';

const APPLICATION_STEPS = [
  { id: 'identity', label: '身份与联系方式', description: '实名、证件、紧急联系人' },
  { id: 'experience', label: '从业经历', description: '带团次数、目的地经验、历史项目' },
  { id: 'qualification', label: '专业资质', description: '急救、户外、滑雪、潜水等（按业务）' },
  { id: 'compliance', label: '商业合规', description: '服务主体、收款、退款规则、保险' },
  { id: 'review', label: '平台审核', description: '人工初审与专业复核' },
] as const;

function stepState(
  index: number,
  status: ReturnType<typeof resolveProfessionalCertificationStatus>
): 'done' | 'current' | 'upcoming' {
  if (status === 'VERIFIED') return 'done';
  if (status === 'NOT_STARTED' || status === 'DRAFT') {
    return index === 0 ? 'current' : 'upcoming';
  }
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'NEED_MORE_INFO') {
    return index < 4 ? 'done' : 'current';
  }
  return 'upcoming';
}

/** PRD §9 · Professional Leader 专业认证（R1 占位） */
export default function ProfessionalCertificationPage() {
  const { data: capabilities, isLoading } = useAccountCapabilities();
  const status = resolveProfessionalCertificationStatus(capabilities);
  const verified = status === 'VERIFIED';

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/settings?tab=governance"
          title="Professional 专业认证"
          subtitle="独立领队与旅行顾问的能力与责任边界认证"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              认证状态
              {!isLoading && (
                <Badge variant={verified ? 'default' : 'secondary'}>
                  {professionalCertificationStatusLabel(status)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              专业认证不等于具体项目审核通过；公开发布仍需单独的发布权限与逐项目审核。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              适用于独立领队、旅行顾问、主题旅行组织者。认证通过后展示「已认证 Professional」及有效期，
              不展示芝麻信用、好友背书或不可解释的综合信用分。
            </p>
            {!verified && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-foreground">
                可先填写
                <Link to="/dashboard/account/professional/apply" className="mx-1 underline">
                  专业认证申请
                </Link>
                ，同时完成
                <Link to="/dashboard/settings?tab=governance" className="mx-1 underline">
                  身份验证
                </Link>
                与私人项目组织。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">申请进度</CardTitle>
            <CardDescription>提交后将进入完整性检查与人工审核</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {APPLICATION_STEPS.map((step, index) => {
                const state = stepState(index, status);
                const Icon = state === 'done' ? CheckCircle2 : Circle;
                return (
                  <li key={step.id} className="flex gap-3">
                    <Icon
                      className={cn(
                        'mt-0.5 h-5 w-5 shrink-0',
                        state === 'done' && 'text-primary',
                        state === 'current' && 'text-amber-600',
                        state === 'upcoming' && 'text-muted-foreground/40'
                      )}
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />
                材料清单
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>· 身份：实名、证件、联系方式、紧急联系人</p>
              <p>· 经历：从业年限、带团次数、目的地经验</p>
              <p>· 资质：按活动类型提交证书与有效期</p>
              <p>· 合规：服务主体、收款主体、退款规则、保险</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-muted-foreground" />
                认证后可申请
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {verified
                  ? '可向平台申请公开非商业或商业项目的发布权限。'
                  : publishingBlockReason(capabilities?.publishingPermission ?? null)}
              </p>
              <Button variant="outline" size="sm" disabled={!verified}>
                申请发布权限
                {!verified && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    需先认证
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          {status === 'NOT_STARTED' || status === 'DRAFT' ? (
            <Button asChild>
              <Link to="/dashboard/account/professional/apply">
                {status === 'DRAFT' ? '继续填写申请' : '开始填写申请'}
              </Link>
            </Button>
          ) : status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'NEED_MORE_INFO' ? (
            <Button variant="outline" asChild>
              <Link to="/dashboard/account/professional/apply">查看申请</Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to="/dashboard/settings?tab=governance">返回身份与权限</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
