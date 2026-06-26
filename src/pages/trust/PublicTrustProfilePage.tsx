import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { TrustProfilePublicView } from '@/components/trust-profile';
import { useUserTrustProfile } from '@/hooks/useTrustProfile';

/** 公开信任档案 · GET /identity/trust-profiles/users/:userId */
export default function PublicTrustProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const inDashboard = location.pathname.startsWith('/dashboard');
  const { data: profile, isLoading, isError } = useUserTrustProfile(userId);

  const content = (
    <TrustProfilePublicView profile={profile} isLoading={isLoading} isError={isError} />
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
          <h1 className="mt-2 text-xl font-semibold">信任档案</h1>
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
          backTo="/dashboard/profile"
          title="信任档案"
          subtitle="验证 · 资质 · 背书 · 声誉事实（无信用分）"
          maxWidth="full"
        />
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">{content}</div>
    </div>
  );
}
