import { Link } from 'react-router-dom';
import { FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Gate1CohortBadge, Gate1StatusBadge } from '../components/Gate1StatusBadges';
import { Gate1RiskBadge } from '../components/Gate1RiskBadge';
import { useGate1AdvisorProjectList, useGate1Projects } from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';
import { projectDetailHref } from '@/lib/gate1-workbench';
import type { Gate1ProjectListSort } from '@/types/gate1';
import { useState } from 'react';

export default function Gate1ProjectListPage() {
  const [sort, setSort] = useState<Gate1ProjectListSort>('needs_action');
  const advisorList = useGate1AdvisorProjectList({ sort });
  const legacyList = useGate1Projects();

  const useAdvisorApi = advisorList.isSuccess && advisorList.data != null;
  const projects = useAdvisorApi ? advisorList.data! : legacyList.data ?? [];
  const isLoading = useAdvisorApi ? advisorList.isLoading : legacyList.isLoading;
  const isError = !useAdvisorApi && legacyList.isError;

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={advisorRoutes.home}
          title="客户项目"
          subtitle="Advisor Workspace · GET /advisor/projects"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={advisorRoutes.projectNew}>
              <Plus className="mr-1 h-4 w-4" />
              创建项目
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={advisorRoutes.metrics}>实验看板</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={advisorRoutes.opsQueue}>运营队列</Link>
          </Button>
          {useAdvisorApi && (
            <Select value={sort} onValueChange={(v) => setSort(v as Gate1ProjectListSort)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_action">需要动作</SelectItem>
                <SelectItem value="departure">出发日期</SelectItem>
                <SelectItem value="created">创建时间</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {isError && <p className="text-sm text-destructive">加载失败</p>}

        {!isLoading && !isError && projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FlaskConical className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">尚无顾问项目</p>
              <Button asChild size="sm">
                <Link to={advisorRoutes.projectNew}>创建第一个项目</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {useAdvisorApi &&
            advisorList.data!.map((project) => (
              <Card key={project.id} className="transition-colors hover:bg-muted/30">
                <Link to={projectDetailHref(project.id, project.nextAction?.tab ?? 'overview')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {project.title}
                      <Gate1CohortBadge cohort={project.cohort} />
                      <Gate1StatusBadge status={project.experimentStatus} />
                      <Gate1RiskBadge level={project.riskLevel} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      {project.destination && <span>{project.destination}</span>}
                      {project.daysToDeparture != null && (
                        <span className="ml-2">· {project.daysToDeparture} 天后出发</span>
                      )}
                      <span className="ml-2">
                        · 成员完成 {Math.round(project.memberCompletionRate * 100)}%
                      </span>
                    </p>
                    {project.nextAction && (
                      <p className="text-foreground">下一动作：{project.nextAction.title}</p>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}

          {!useAdvisorApi &&
            legacyList.data?.map((project) => (
              <Card key={project.id} className="transition-colors hover:bg-muted/30">
                <Link to={projectDetailHref(project.id, 'overview')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {project.title}
                      <Gate1CohortBadge cohort={project.cohort} />
                      <Gate1StatusBadge status={project.experimentStatus} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {project.destination && <span>{project.destination}</span>}
                    {project.participantCount != null && (
                      <span className="ml-2">· {project.participantCount} 人</span>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
