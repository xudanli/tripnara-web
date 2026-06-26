import { Link, useParams } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Button } from '@/components/ui/button';
import { Gate1TrustSurfacePanel } from '../components/Gate1TrustSurfacePanel';
import { Gate1CohortBadge, Gate1StatusBadge } from '../components/Gate1StatusBadges';
import { useGate1Project } from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';

/** 独立信任说明页 — GET /advisor/projects/:projectId/trust-surface */
export default function Gate1TrustSurfacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useGate1Project(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={36} />
      </div>
    );
  }

  if (isError || !project || !projectId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : '项目不存在'}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={advisorRoutes.project(projectId)}
          title="信任说明"
          subtitle={project.title}
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Gate1CohortBadge cohort={project.cohort} />
          <Gate1StatusBadge status={project.experimentStatus} />
          <Button variant="outline" size="sm" asChild>
            <Link to={advisorRoutes.project(projectId)}>返回项目详情</Link>
          </Button>
        </div>

        <Gate1TrustSurfacePanel projectId={projectId} />
      </div>
    </div>
  );
}
