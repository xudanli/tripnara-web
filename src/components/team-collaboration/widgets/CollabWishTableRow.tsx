import { Lock, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoryLabelFor, WISH_VISIBILITY_LABELS } from '@/lib/wishlist-model';
import type { TeamWishItem, TripWishItem, WishVisibility } from '@/types/trip-wishes';
import { cn } from '@/lib/utils';

type WishRowItem = TripWishItem | TeamWishItem;

interface CollabWishTableRowProps {
  wish: WishRowItem;
  teamWallView?: boolean;
  authorName?: string;
  highlighted?: boolean;
  onDelete?: () => void;
  className?: string;
}

const CATEGORY_TAG_STYLES: Record<string, string> = {
  activities: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  dining: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  accommodation: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  destination_route: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  main_transport: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  local_transport: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  shopping: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  insurance_visa: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
};

function impactLabel(importance: number): { label: string; dot: string } {
  if (importance >= 4) {
    return { label: '高影响', dot: 'bg-rose-500' };
  }
  if (importance === 3) {
    return { label: '中等影响', dot: 'bg-amber-500' };
  }
  return { label: '低影响', dot: 'bg-sky-500' };
}

function visibilityIcon(visibility: WishVisibility) {
  if (visibility === 'private') return Lock;
  if (visibility === 'signed') return User;
  return User;
}

export function CollabWishTableRow({
  wish,
  teamWallView = false,
  authorName,
  highlighted = false,
  onDelete,
  className,
}: CollabWishTableRowProps) {
  const visibility = wish.visibility as WishVisibility;
  const VisIcon = visibilityIcon(visibility);
  const impact = impactLabel(wish.importance);
  const categoryLabel = categoryLabelFor(wish);
  const tagStyle =
    CATEGORY_TAG_STYLES[wish.category] ??
    'bg-muted text-muted-foreground';

  const displayAuthor =
    teamWallView && 'authorDisplayName' in wish && wish.authorDisplayName
      ? wish.authorDisplayName
      : authorName;

  return (
    <article
      className={cn(
        'group grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-border/50 px-2 py-2.5 text-xs last:border-b-0 hover:bg-muted/20',
        highlighted && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {teamWallView && displayAuthor ? (
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
            {displayAuthor.slice(0, 1)}
          </span>
        ) : (
          <VisIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <p className="min-w-0 line-clamp-2 leading-snug text-foreground">{wish.text}</p>
      </div>

      <span className={cn('hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline', tagStyle)}>
        {categoryLabel}
      </span>

      <span className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground md:flex">
        <VisIcon className="h-3 w-3" aria-hidden />
        {WISH_VISIBILITY_LABELS[visibility]}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', impact.dot)} aria-hidden />
          {impact.label}
        </span>
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
    </article>
  );
}
