import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatTrustedProjectBudget,
  trustedProjectCommercialLabel,
  trustedProjectPublisherLabel,
  trustedProjectStatusLabel,
} from '@/lib/trusted-projects-display';
import type { TrustedProjectListing } from '@/types/trusted-projects';
import { TrustedProjectPublisherLink } from './TrustedProjectPublisherLink';

interface TrustedProjectCardProps {
  project: TrustedProjectListing;
  detailPathPrefix?: string;
}

export function TrustedProjectCard({
  project,
  detailPathPrefix = '/trusted-projects',
}: TrustedProjectCardProps) {
  const slotsLeft = project.slotsRemaining ?? project.slotsTotal;
  const publisherLabel = trustedProjectPublisherLabel(project);

  return (
    <Card className="relative transition-shadow hover:shadow-md">
      <Link
        to={`${detailPathPrefix}/${project.id}`}
        className="absolute inset-0 z-0 rounded-lg"
        aria-label={`查看项目：${project.title}`}
      />
      <CardHeader className="relative z-10 pointer-events-none pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
          <Badge variant="secondary">{trustedProjectCommercialLabel(project.commercialType)}</Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
          {publisherLabel && (
            <TrustedProjectPublisherLink
              project={project}
              listingBasePath={detailPathPrefix}
              className="pointer-events-auto text-xs text-foreground"
              onClick={(event) => event.stopPropagation()}
            />
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {project.destination}
          </span>
          <span>
            {format(new Date(project.startDate), 'yyyy/M/d')} –{' '}
            {format(new Date(project.endDate), 'yyyy/M/d')}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pointer-events-none space-y-3">
        {project.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.summary}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            剩余 {slotsLeft}/{project.slotsTotal} 席
          </span>
          <span>{formatTrustedProjectBudget(project.budgetMinCents, project.budgetMaxCents)}</span>
        </div>
        {project.listingStatus !== 'published' && (
          <Badge variant="outline">{trustedProjectStatusLabel(project.listingStatus)}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
