import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { useTrustedProject } from '@/hooks/useTrustedProjects';
import { useAuth } from '@/hooks/useAuth';
import { useFitQuestionnaire } from '@/hooks/useProjectFit';
import {
  formatTrustedProjectBudget,
  trustedProjectCommercialLabel,
  trustedProjectPublisherLabel,
  trustedProjectStatusLabel,
} from '@/lib/trusted-projects-display';
import {
  TrustedProjectPublisherLink,
  TrustedProjectResponsibleUserLink,
} from '../components/TrustedProjectPublisherLink';
import { OpenTrustedProjectInPlanStudioButton } from '../components/OpenTrustedProjectInPlanStudioButton';

interface TrustedProjectDetailPageProps {
  basePath?: string;
  showDashboardChrome?: boolean;
}

export default function TrustedProjectDetailPage({
  basePath = '/dashboard/trusted-projects',
  showDashboardChrome = true,
}: TrustedProjectDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: project, isLoading, isError } = useTrustedProject(id);
  const { data: previewQuestionnaire } = useFitQuestionnaire(id, 'preview');

  const fitPath = `/dashboard/trusted-projects/${id}/fit`;

  const body = (
    <>
      {isLoading && (
        <div className="flex justify-center py-16">
          <LogoLoading size={36} />
        </div>
      )}

      {isError && (
        <p className="py-12 text-center text-sm text-muted-foreground">项目不存在或已下架</p>
      )}

      {project && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge>{trustedProjectCommercialLabel(project.commercialType)}</Badge>
                  <Badge variant="outline">{trustedProjectStatusLabel(project.listingStatus)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {trustedProjectPublisherLabel(project) && (
                <p>
                  <span className="text-muted-foreground">发布：</span>
                  <TrustedProjectPublisherLink
                    project={project}
                    listingBasePath={basePath}
                    showIcon={false}
                  />
                  {project.publisherSubjectType === 'ORGANIZATION' &&
                    project.responsibleUserDisplayName && (
                      <span className="text-muted-foreground">
                        {' '}
                        ·{' '}
                        <TrustedProjectResponsibleUserLink
                          project={project}
                          listingBasePath={basePath}
                          className="text-muted-foreground hover:text-primary"
                        />
                      </span>
                    )}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">目的地：</span>
                {project.destination}
              </p>
              <p>
                <span className="text-muted-foreground">日期：</span>
                {format(new Date(project.startDate), 'yyyy年M月d日')} –{' '}
                {format(new Date(project.endDate), 'yyyy年M月d日')}
              </p>
              <p>
                <span className="text-muted-foreground">名额：</span>
                剩余 {project.slotsRemaining ?? project.slotsTotal}/{project.slotsTotal}
              </p>
              <p>
                <span className="text-muted-foreground">预算：</span>
                {formatTrustedProjectBudget(project.budgetMinCents, project.budgetMaxCents)}
              </p>
              {project.summary && <p className="leading-relaxed">{project.summary}</p>}
              {project.riskDisclosure && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">风险披露</p>
                  <p className="mt-1 text-muted-foreground">{project.riskDisclosure}</p>
                </div>
              )}
              {project.refundPolicy && (
                <p>
                  <span className="text-muted-foreground">退款政策：</span>
                  {project.refundPolicy}
                </p>
              )}
            </CardContent>
          </Card>

          {project.listingStatus === 'published' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4" />
                  申请加入（Project Fit）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  先完成适合度评估，再提交正式申请。展示四档结论与待确认项，不展示综合信用分。
                </p>
                {(previewQuestionnaire?.questions ?? []).length > 0 && (
                  <ul className="text-xs text-muted-foreground">
                    {previewQuestionnaire!.questions.map((q) => (
                      <li key={q.questionKey}>· {q.label}</li>
                    ))}
                  </ul>
                )}
                {!isAuthenticated ? (
                  <Button asChild>
                    <Link to="/login">登录后测一测</Link>
                  </Button>
                ) : (
                  <Button onClick={() => navigate(fitPath)}>测一测是否适合</Button>
                )}
              </CardContent>
            </Card>
          )}

          {showDashboardChrome && isAuthenticated && (
            <div className="flex flex-wrap gap-2">
              <OpenTrustedProjectInPlanStudioButton project={project} />
              <Button variant="outline" asChild>
                <Link to={`${basePath}/${project.id}/manage`}>管理此项目（发布者）</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!showDashboardChrome) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          返回
        </Button>
        {body}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader backTo={basePath} title="项目详情" maxWidth="full" />
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">{body}</div>
    </div>
  );
}
