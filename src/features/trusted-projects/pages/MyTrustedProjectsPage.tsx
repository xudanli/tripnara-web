import { Link } from 'react-router-dom';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { TrustedProjectCard } from '../components/TrustedProjectCard';
import { OpenTrustedProjectInPlanStudioButton } from '../components/OpenTrustedProjectInPlanStudioButton';
import { useMyTrustedProjects } from '@/hooks/useTrustedProjects';
import { useCanPublishTrustedProject } from '@/hooks/useCanPublishTrustedProject';

export default function MyTrustedProjectsPage() {
  const { data: projects, isLoading } = useMyTrustedProjects();
  const { canPublish } = useCanPublishTrustedProject();

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/trusted-projects"
          title="我的可信项目"
          subtitle="草稿、审核中与已发布"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap gap-2">
          {canPublish && (
            <Button asChild>
              <Link to="/dashboard/trusted-projects/new">
                <Plus className="mr-1 h-4 w-4" />
                创建草稿
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard/project-fit/applications">申请中心</Link>
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {!isLoading && (projects ?? []).length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {canPublish ? (
              <>
                尚无项目。
                <Link to="/dashboard/trusted-projects/new" className="ml-1 underline">
                  创建第一个草稿
                </Link>
              </>
            ) : (
              '尚无项目。公开发布需完成专业/机构认证并开通发布权限。'
            )}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {(projects ?? []).map((project) => (
            <div key={project.id} className="space-y-2">
              <TrustedProjectCard project={project} />
              <div className="flex flex-wrap gap-2 px-1">
                <OpenTrustedProjectInPlanStudioButton
                  project={project}
                  size="sm"
                  variant="secondary"
                />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/dashboard/trusted-projects/${project.id}/manage`}>
                    <Settings2 className="mr-1 h-3.5 w-3.5" />
                    管理
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
