import { Link } from 'react-router-dom';
import { ExternalLink, Footprints, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StartHikePlanButton } from '@/components/hiking/StartHikePlanButton';
import {
  TREK_ACTIVITY_LABELS,
  trekBridgeHeadline,
} from '../lib/trek-plaza-bridge';
import type { RecruitmentPostCard } from '@/types/match-square';
import { cn } from '@/lib/utils';

type TrekPlazaBridgeSectionProps = {
  post: Pick<
    RecruitmentPostCard,
    'routeDirectionId' | 'routeDirectionName' | 'activityProfile' | 'destination'
  >;
  className?: string;
  compact?: boolean;
};

/** 招募详情 ↔ 徒步模块联动条 */
export function TrekPlazaBridgeSection({ post, className, compact }: TrekPlazaBridgeSectionProps) {
  if (!post.routeDirectionId) return null;

  const headline = trekBridgeHeadline(post);
  const trailHref = `/dashboard/trails/${post.routeDirectionId}`;
  const profileLabel = post.activityProfile
    ? TREK_ACTIVITY_LABELS[post.activityProfile]
    : null;

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-muted/30 px-4 py-3.5 text-sm',
        className
      )}
      aria-label="徒步路线联动"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            <Mountain className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{headline ?? 'Premium Trekking'}</span>
            {profileLabel && (
              <span className="rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {profileLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            已绑定 RouteDirection 路线
            {post.routeDirectionName ? ` · ${post.routeDirectionName}` : ''}
            {post.destination ? ` · ${post.destination}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size={compact ? 'sm' : 'default'} asChild>
            <Link to={trailHref}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              查看路线
            </Link>
          </Button>
          {!compact && (
            <StartHikePlanButton
              size="sm"
              routeDirectionId={post.routeDirectionId}
              nameCN={post.routeDirectionName ?? undefined}
              routeDirectionName={post.routeDirectionName ?? undefined}
            />
          )}
        </div>
      </div>
      {!compact && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Footprints className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          成团后可从路线详情创建徒步计划，同步 Readiness 评估与离线 DEM 包。
        </p>
      )}
    </section>
  );
}
