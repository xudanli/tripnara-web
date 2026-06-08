import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { RecruitmentPostCard } from '@/types/match-square';
import {
  APPLICATION_STATUS_LABELS,
  blocksApplyAction,
} from '../lib/application-status';

interface RecruitmentDetailActionBarProps {
  post: RecruitmentPostCard;
  captain: boolean;
  canApply: boolean;
  teamworkBlocked: boolean;
  recommendationHidden: boolean;
  onApply: () => void;
  /** 管理申请路由；弹窗与独立页共用 */
  manageHref: string;
  /** dialog 内嵌底栏，非 sticky */
  embedded?: boolean;
  className?: string;
}

/** 详情 CTA — 独立页吸底 / 弹窗底栏 */
export function RecruitmentDetailActionBar({
  post,
  captain,
  canApply,
  teamworkBlocked,
  recommendationHidden,
  onApply,
  manageHref,
  embedded = false,
  className,
}: RecruitmentDetailActionBarProps) {
  let content: ReactNode = null;

  if (captain) {
    content = (
      <Button className="w-full sm:w-auto" asChild>
        <Link to={manageHref}>管理申请</Link>
      </Button>
    );
  } else if (canApply && !teamworkBlocked && !recommendationHidden) {
    if (post.viewerApplicationStatus && blocksApplyAction(post.viewerApplicationStatus)) {
      content = (
        <Button variant="outline" className="w-full sm:w-auto" disabled>
          {APPLICATION_STATUS_LABELS[post.viewerApplicationStatus]}
        </Button>
      );
    } else {
      content = (
        <Button className="w-full sm:w-auto" onClick={onApply}>
          {post.viewerApplicationStatus === 'rejected' || post.viewerApplicationStatus === 'withdrawn'
            ? '再次申请'
            : '申请加入'}
        </Button>
      );
    }
  } else if (teamworkBlocked) {
    content = (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        {post.teamworkBlockReason ?? '组队风格不匹配，暂不可申请'}
      </p>
    );
  } else if (recommendationHidden) {
    content = (
      <Button variant="outline" className="w-full sm:w-auto" disabled>
        暂不可申请
      </Button>
    );
  }

  if (!content) return null;

  return (
    <div
      className={cn(
        embedded
          ? 'shrink-0 border-t border-border bg-background px-4 py-3'
          : cn(
              'sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm',
              'supports-[backdrop-filter]:bg-background/80'
            ),
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3',
          embedded ? 'justify-end' : 'mx-auto max-w-4xl justify-end'
        )}
      >
        {content}
      </div>
    </div>
  );
}
