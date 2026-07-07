import { Heart, ImageIcon, Mic, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TeamWishItem, TripWishItem, WishInputMode } from '@/types/trip-wishes';
import {
  categoryLabelFor,
  teamWallWishLabel,
  WISH_VISIBILITY_LABELS,
} from '@/lib/wishlist-model';
import { importanceLevel } from '@/lib/wishlist-model';
import { cn } from '@/lib/utils';
import { WishImportanceDots } from './WishImportanceDots';
import { WishVisibilityToggle } from './WishVisibilityToggle';
import type { WishVisibility } from '@/types/trip-wishes';
import { wishEmptyBox } from './wishlist-ui';

type WishListItem = TripWishItem | TeamWishItem;

interface WishItemCardProps {
  wish: WishListItem;
  displayName?: string;
  teamWallView?: boolean;
  onVisibilityChange?: (visibility: WishVisibility) => void;
  onDelete?: () => void;
  highlighted?: boolean;
  /** 协作中心紧凑卡片 */
  compact?: boolean;
  collabLayout?: boolean;
  includedInPlan?: boolean;
  className?: string;
}

const SOURCE_ICONS: Partial<Record<WishInputMode, typeof Mic | null>> = {
  card_select: Sparkles,
  free_text: null,
  voice: Mic,
  inspiration: ImageIcon,
  ai_convert: Sparkles,
};

function isMineWish(wish: WishListItem): wish is TripWishItem {
  return 'inputMode' in wish;
}

function planStatusBadge(
  wish: WishListItem,
  includedInPlan?: boolean,
): { label: string; className: string } | null {
  if (!('agentEligible' in wish)) return null;
  if (includedInPlan && wish.agentEligible) {
    return {
      label: '部分纳入',
      className: 'border-border/30 bg-muted/10 text-muted-foreground dark:text-muted-foreground',
    };
  }
  if (includedInPlan) {
    return {
      label: '已纳入计划',
      className: 'border-gate-allow-border bg-gate-allow/30 text-gate-allow-foreground',
    };
  }
  if (wish.agentEligible) {
    return {
      label: '待优化',
      className: 'border-gate-confirm-border bg-gate-confirm/30 text-gate-confirm-foreground',
    };
  }
  return null;
}

export function WishItemCard({
  wish,
  displayName,
  teamWallView = false,
  onVisibilityChange,
  onDelete,
  highlighted = false,
  compact = false,
  collabLayout = false,
  includedInPlan = false,
  className,
}: WishItemCardProps) {
  const inputMode = isMineWish(wish) ? wish.inputMode : undefined;
  const SourceIcon = inputMode ? SOURCE_ICONS[inputMode] : null;
  const authorName =
    teamWallView && 'authorDisplayName' in wish && wish.authorDisplayName
      ? wish.authorDisplayName
      : displayName;
  const headerLabel = teamWallView
    ? teamWallWishLabel(wish, authorName)
    : WISH_VISIBILITY_LABELS[wish.visibility as WishVisibility];

  const statusBadge = collabLayout ? planStatusBadge(wish, includedInPlan) : null;

  if (collabLayout && !teamWallView) {
    return (
      <article
        className={cn(
          'group rounded-lg border border-border/70 bg-card px-3 py-2 transition-colors hover:bg-muted/15',
          highlighted && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          className,
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="shrink-0 font-medium">{headerLabel}</span>
          <span className="text-border/80">·</span>
          <span className="min-w-0 truncate">{categoryLabelFor(wish)}</span>
          {SourceIcon ? <SourceIcon className="h-3 w-3 shrink-0" aria-hidden /> : null}
          {statusBadge ? (
            <Badge
              variant="outline"
              className={cn('ml-auto h-5 shrink-0 px-1.5 text-[10px] font-normal', statusBadge.className)}
            >
              {statusBadge.label}
            </Badge>
          ) : (
            <span className="ml-auto shrink-0" aria-hidden />
          )}
        </div>

        <div className="mt-1 flex items-start gap-2">
          <p className="min-w-0 flex-1 line-clamp-2 text-xs leading-snug text-foreground">{wish.text}</p>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            <WishImportanceDots value={importanceLevel(wish.importance)} />
            {!teamWallView && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                aria-label="删除心愿"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group rounded-lg border bg-card transition-colors hover:bg-muted/20',
        compact ? 'p-3' : 'p-4',
        highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{headerLabel}</span>
          {!compact ? (
            <>
              <span className="text-border">|</span>
              <Badge variant="secondary" className="rounded-md px-2 py-0 text-[11px] font-normal">
                {categoryLabelFor(wish)}
              </Badge>
            </>
          ) : null}
          {SourceIcon ? (
            <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          ) : null}
          {statusBadge ? (
            <Badge variant="outline" className={cn('ml-auto text-[10px] font-normal', statusBadge.className)}>
              {statusBadge.label}
            </Badge>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <WishImportanceDots value={importanceLevel(wish.importance)} />
              {!teamWallView && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                  aria-label="删除心愿"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <p className={cn('leading-relaxed', compact ? 'line-clamp-3 text-xs' : 'text-sm')}>
          {wish.text}
        </p>

        {!teamWallView && onVisibilityChange ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">可见范围</span>
            <WishVisibilityToggle
              value={wish.visibility as WishVisibility}
              onChange={onVisibilityChange}
              compact
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function WishEmptyState() {
  return (
    <div className={wishEmptyBox}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <Heart className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">暂无心愿</p>
      <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
        在左侧添加偏好后，规划时 AI 会纳入参考
      </p>
    </div>
  );
}
