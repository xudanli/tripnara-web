import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { AgencyCertificationApplicationForm } from '@/components/account-governance/AgencyCertificationApplicationForm';

/** PRD §10.1 · Agency 企业认证申请（R1 表单骨架） */
export default function AgencyCertificationApplyPage() {
  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/account/agency"
          title="机构企业认证申请"
          subtitle="明确商业与履约责任主体，不替代个人专业认证"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">企业材料</CardTitle>
            <CardDescription>草稿保存在本设备；营业执照等原件由审核人员授权查阅。</CardDescription>
          </CardHeader>
          <CardContent>
            <AgencyCertificationApplicationForm />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/dashboard/settings?tab=governance" className="underline">
            身份与权限中心
          </Link>
        </p>
      </div>
    </div>
  );
}
