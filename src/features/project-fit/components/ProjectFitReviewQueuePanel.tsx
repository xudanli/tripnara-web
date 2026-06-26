import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectFitResultBadge } from './ProjectFitResultBadge';
import { SystemRecommendationBadge } from './SystemRecommendationBadge';
import {
  fitOverallResultLabel,
  projectFitApplicationStatusLabel,
} from '@/lib/project-fit-display';
import type { FitApplicationReviewQueueItem } from '@/types/project-fit';

interface ProjectFitReviewQueuePanelProps {
  listingId: string;
  items: FitApplicationReviewQueueItem[];
}

export function ProjectFitReviewQueuePanel({
  listingId: _listingId,
  items,
}: ProjectFitReviewQueuePanelProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">审核队列为空</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.applicationId}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {item.applicantDisplayName ?? item.applicationId}
              {item.status && (
                <Badge variant="outline">{projectFitApplicationStatusLabel(item.status)}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectFitResultBadge
                result={item.fitSummary.overallResult}
                label={fitOverallResultLabel(item.fitSummary.overallResult)}
              />
              <SystemRecommendationBadge recommendation={item.systemRecommendation} />
            </div>
            <p className="text-xs text-muted-foreground">
              团队影响：{item.fitSummary.teamImpactLevel}
              {item.fitSummary.pendingConfirmations.length > 0 &&
                ` · 待确认 ${item.fitSummary.pendingConfirmations.length} 项`}
            </p>
            {item.fitSummary.hardBlockers.length > 0 && (
              <p className="text-xs text-destructive">
                硬性未通过：{item.fitSummary.hardBlockers.join('、')}
              </p>
            )}
            <Button size="sm" asChild>
              <Link to={`/dashboard/project-fit/applications/${item.applicationId}/review`}>
                打开审核台
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
