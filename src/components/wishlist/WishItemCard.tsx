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

export function WishItemCard({
  wish,
  displayName,
  teamWallView = false,
  onVisibilityChange,
  onDelete,
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

  return (
    <article
      className={cn(
        'group rounded-lg border bg-card p-4 transition-colors hover:bg-muted/20',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{headerLabel}</span>
          <span className="text-border">|</span>
          <Badge variant="secondary" className="rounded-md px-2 py-0 text-[11px] font-normal">
            {categoryLabelFor(wish)}
          </Badge>
          {SourceIcon ? (
            <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          ) : null}
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
        </div>

        <p className="text-sm leading-relaxed">{wish.text}</p>

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
