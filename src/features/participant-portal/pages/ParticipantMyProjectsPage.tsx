import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { useParticipantMyProjects } from '@/hooks/useParticipantPortal';
import { gate1ParticipantStatusLabel } from '@/lib/gate1-display';
import { gate1CohortLabel } from '@/lib/gate1-display';
import { normalizeParticipantPortalHref } from '../lib/participant-portal-link';
import type { ParticipantMyProjectEntry } from '@/types/participant-portal';

function ProjectEntryCard({ entry }: { entry: ParticipantMyProjectEntry }) {
  const href = normalizeParticipantPortalHref(entry.portalPath);

  return (
    <Link
      to={href}
      className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{entry.project.title}</p>
          <p className="text-xs text-muted-foreground">
            {entry.project.destination}
            {entry.project.startDate &&
              ` · ${format(new Date(entry.project.startDate), 'yyyy/M/d')}`}
            {entry.project.endDate &&
              ` – ${format(new Date(entry.project.endDate), 'yyyy/M/d')}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {gate1CohortLabel(entry.project.cohort)} · 角色 {entry.role}
          </p>
        </div>
        <Badge variant="secondary">{gate1ParticipantStatusLabel(entry.status)}</Badge>
      </div>
      <p className="mt-2 text-xs text-primary">进入成员门户 →</p>
    </Link>
  );
}

export default function ParticipantMyProjectsPage() {
  const { data: projects, isLoading, isError } = useParticipantMyProjects();

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard"
          title="我的旅行项目"
          subtitle="Participant Portal · 成员参与入口"
          maxWidth="2xl"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">进行中的成员项目</CardTitle>
            <CardDescription>
              通过邀请或 Project Fit 录取加入的项目。也可直接使用邀请链接进入。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : isError ? (
              <p className="text-sm text-muted-foreground">
                暂时无法加载项目列表，请稍后重试或使用邀请链接进入。
              </p>
            ) : !projects?.length ? (
              <p className="text-sm text-muted-foreground">
                暂无进行中的成员项目。收到邀请后打开链接即可加入。
              </p>
            ) : (
              <ul className="space-y-3">
                {projects.map((entry) => (
                  <li key={entry.participantId}>
                    <ProjectEntryCard entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
