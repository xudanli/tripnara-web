import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { ProjectFitReviewQueuePanel } from '@/features/project-fit/components/ProjectFitReviewQueuePanel';
import { FitConfigEditorPanel } from '@/features/project-fit/components/FitConfigEditorPanel';
import { RuleTemplateApplyPanel } from '@/features/project-fit/components/RuleTemplateApplyPanel';
import { trustedProjectsApi } from '@/api/trusted-projects';
import { useTrustedProject } from '@/hooks/useTrustedProjects';
import {
  eligibilityRulesQueryKey,
  useApplicationReviewQueue,
  useEligibilityRules,
  useFitConfig,
} from '@/hooks/useProjectFit';
import { OpenTrustedProjectInPlanStudioButton } from '../components/OpenTrustedProjectInPlanStudioButton';
import { trustedProjectStatusLabel } from '@/lib/trusted-projects-display';

export default function TrustedProjectManagePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useTrustedProject(id);
  const { data: rules, isLoading: rulesLoading } = useEligibilityRules(id);
  const { data: fitConfig } = useFitConfig(id);
  const { data: reviewQueue, isLoading: queueLoading } = useApplicationReviewQueue(id);

  const seedRules = useMutation({
    mutationFn: () => trustedProjectsApi.seedDefaultEligibilityRules(id!),
    onSuccess: () => {
      toast.success('已初始化默认准入规则（规则版本已 bump）');
      void queryClient.invalidateQueries({ queryKey: eligibilityRulesQueryKey(id!) });
    },
    onError: () => toast.error('初始化失败'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['trusted-projects', id] });
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await trustedProjectsApi.submit(id);
      toast.success('已提交审核');
      refresh();
    } catch {
      toast.error('提交失败');
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await trustedProjectsApi.close(id);
      toast.success('项目已关闭');
      refresh();
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/trusted-projects/mine"
          title="管理项目"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {project && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {project.title}
                  <Badge variant="outline">{trustedProjectStatusLabel(project.listingStatus)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <OpenTrustedProjectInPlanStudioButton project={project} />
                {project.listingStatus === 'draft' && (
                  <Button onClick={() => void handleSubmit()}>提交审核</Button>
                )}
                {project.listingStatus === 'published' && (
                  <Button variant="destructive" onClick={() => void handleClose()}>
                    关闭招募
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link to={`/dashboard/trusted-projects/${project.id}`}>查看公开页</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">准入规则</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seedRules.mutate()}
                  disabled={seedRules.isPending}
                >
                  初始化默认规则
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {rulesLoading && <LogoLoading size={24} />}
                {fitConfig?.ruleVersion != null && (
                  <p className="text-xs text-muted-foreground">
                    规则版本 v{fitConfig.ruleVersion}
                    {fitConfig.reassessmentTtlHours != null &&
                      ` · 评估有效期 ${fitConfig.reassessmentTtlHours}h`}
                  </p>
                )}
                {!rulesLoading && (rules ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    尚未配置规则。更新规则后，旧评估将被标记 EXPIRED。
                  </p>
                )}
                {(rules ?? []).map((rule) => (
                  <div key={rule.id} className="rounded-lg border px-3 py-2 text-sm">
                    <p className="font-medium">{rule.conditionKey}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.explanationTemplate ?? rule.ruleType} · {rule.severity}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">准入规则模板</CardTitle>
              </CardHeader>
              <CardContent>
                {id && (
                  <RuleTemplateApplyPanel
                    listingId={id}
                    organizationId={project.organizationId}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">适合度配置</CardTitle>
              </CardHeader>
              <CardContent>{id && <FitConfigEditorPanel listingId={id} />}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Fit 审核队列</CardTitle>
              </CardHeader>
              <CardContent>
                {queueLoading && <LogoLoading size={24} />}
                {!queueLoading && id && (
                  <ProjectFitReviewQueuePanel listingId={id} items={reviewQueue?.items ?? []} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
