import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { ProfessionalCertificationApplicationForm } from '@/components/account-governance/ProfessionalCertificationApplicationForm';

/** PRD §9.3 · Professional 认证申请材料（R1 表单骨架） */
export default function ProfessionalCertificationApplyPage() {
  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/account/professional"
          title="填写专业认证申请"
          subtitle="材料将用于平台审核，不会用于信用评分或陌生人匹配"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">申请材料</CardTitle>
            <CardDescription>
              草稿自动保存在本设备。商业发布项目需完整填写合规信息。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfessionalCertificationApplicationForm />
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
