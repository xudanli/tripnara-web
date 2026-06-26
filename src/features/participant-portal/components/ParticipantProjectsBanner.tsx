import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useParticipantMyProjects } from '@/hooks/useParticipantPortal';
import { gate1CohortLabel, gate1ParticipantStatusLabel } from '@/lib/gate1-display';
import { normalizeParticipantPortalHref } from '../lib/participant-portal-link';

interface ParticipantProjectsBannerProps {
  /** 紧凑模式：单行摘要 */
  compact?: boolean;
  className?: string;
}

export function ParticipantProjectsBanner({ compact = false, className }: ParticipantProjectsBannerProps) {
  const { data: projects, isLoading, isError } = useParticipantMyProjects();

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      </div>
    );
  }

  if (isError || !projects?.length) return null;

  if (compact) {
    const first = projects[0];
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate text-sm">
              {projects.length === 1
                ? `成员项目：${first.project.title}`
                : `${projects.length} 个进行中的成员项目`}
            </p>
          </div>
          <Link
            to="/dashboard/participant/projects"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            查看
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            成员参与项目
          </CardTitle>
          <Link
            to="/dashboard/participant/projects"
            className="text-xs text-primary hover:underline"
          >
            全部
          </Link>
        </div>
        <CardDescription>机构订单或可信项目录取后的成员门户入口</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.slice(0, 3).map((entry) => (
          <Link
            key={entry.participantId}
            to={normalizeParticipantPortalHref(entry.portalPath)}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{entry.project.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.project.destination}
                {entry.project.startDate
                  ? ` · ${format(new Date(entry.project.startDate), 'yyyy/M/d')}`
                  : ''}
                {' · '}
                {gate1CohortLabel(entry.project.cohort)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {gate1ParticipantStatusLabel(entry.status)}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
