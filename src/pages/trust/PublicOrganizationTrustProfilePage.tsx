import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { OrganizationTrustProfilePublicView } from '@/components/trust-profile/OrganizationTrustProfilePublicView';
import { useOrganizationTrustProfile } from '@/hooks/useTrustProfile';

/** 公开机构信任档案 · GET /identity/trust-profiles/organizations/:organizationId */
export default function PublicOrganizationTrustProfilePage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const location = useLocation();
  const inDashboard = location.pathname.startsWith('/dashboard');
  const { data: profile, isLoading, isError } = useOrganizationTrustProfile(organizationId);

  const content = (
    <OrganizationTrustProfilePublicView
      profile={profile}
      isLoading={isLoading}
      isError={isError}
    />
  );

  if (!inDashboard) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="border-b bg-background/80 px-4 py-4 md:px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/trusted-projects">
              <ArrowLeft className="mr-1 h-4 w-4" />
              可信项目市场
            </Link>
          </Button>
          <h1 className="mt-2 text-xl font-semibold">机构信任档案</h1>
          <p className="text-sm text-muted-foreground">无综合信用分 · 仅可解释事实</p>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/trusted-projects"
          title="机构信任档案"
          subtitle="验证 · 资质 · 背书 · 声誉事实（无信用分）"
          maxWidth="full"
        />
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">{content}</div>
    </div>
  );
}
