import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ListChecks, Plane, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import type { TripInstantiationStrategy } from '@/types/trip-instantiation';
import {
  useInstantiateTrip,
  useTripInstantiationPreview,
} from '../hooks/useMatchSquare';
import { buildTripInstantiationPreviewFromPost } from '../lib/trip-instantiation/build-instantiation-preview-from-post';
import { normalizeActiveTripPath } from '@/features/active-trip/lib/normalize-active-trip-path';
import { CollaborativeTaskFlywheelPanel } from './CollaborativeTaskFlywheelPanel';

const STRATEGY_LABELS: Record<TripInstantiationStrategy, string> = {
  route_template_v1: '路线模板驱动',
  vibe_contextual_cards: 'Vibe 情境卡片',
  generic_plaza_trip: '广场通用行程',
};

type InstantiateTripPanelProps = {
  postId: string;
  post?: RecruitmentPostCard;
  /** 满员 closed 后自动尝试 instantiate（skipIfExists） */
  autoOnClosed?: boolean;
  className?: string;
};

function isEligibleForInstantiation(post: RecruitmentPostCard): boolean {
  return (
    post.status === 'closed' ||
    (post.teamStatus?.slotsRemaining != null && post.teamStatus.slotsRemaining <= 0)
  );
}

/** §3.12 · 成团转 Active Trip */
export function InstantiateTripPanel({
  postId,
  post,
  autoOnClosed = false,
  className,
}: InstantiateTripPanelProps) {
  const navigate = useNavigate();
  const enabled = Boolean(post);
  const { data: previewApi, isLoading, isError, isFetching } = useTripInstantiationPreview(
    postId,
    enabled,
    post ?? null
  );
  const instantiate = useInstantiateTrip();
  const autoTriedRef = useRef(false);

  const localPreview = useMemo(
    () => (post ? buildTripInstantiationPreviewFromPost(post) : null),
    [post]
  );

  const preview = previewApi ?? localPreview;
  const usedLocalFallback = !previewApi && Boolean(localPreview) && !isLoading;

  const existing =
    preview?.existingResult ?? post?.tripInstantiationResult ?? null;
  const tripPath = normalizeActiveTripPath(
    existing?.activeTripPath,
    existing?.tripId
  );

  const taskPreview = preview?.collaborativeTaskPreview ?? [];

  const runInstantiate = async (opts?: { skipIfExists?: boolean; silent?: boolean }) => {
    if (!post) return null;
    try {
      const result = await instantiate.mutateAsync({
        postId,
        body: { skipIfExists: opts?.skipIfExists ?? false },
        post,
      });
      if (!result.success) {
        if (!opts?.silent) toast.error(result.message ?? '实例化失败');
        return result;
      }
      if (!opts?.silent) {
        toast.success(result.message ?? 'Active Trip 已创建');
      }
      const path = normalizeActiveTripPath(result.activeTripPath, result.tripId);
      if (path) {
        navigate(path);
      }
      return result;
    } catch {
      if (!opts?.silent) toast.error('实例化 Active Trip 失败');
      return null;
    }
  };

  useEffect(() => {
    if (!autoOnClosed || !post || !isEligibleForInstantiation(post)) return;
    if (existing?.tripId || autoTriedRef.current) return;
    autoTriedRef.current = true;
    void runInstantiate({ skipIfExists: true, silent: false }).then((result) => {
      if (result?.success && result.tripId) {
        toast.success('满员后已自动创建 Active Trip');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOnClosed, post?.id, post?.status, existing?.tripId]);

  if (!post) return null;

  if (isLoading && !preview) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">加载 instantiate 预览…</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div
        className={cn(
          'rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive',
          className
        )}
      >
        instantiate 预览加载失败
        {isError && (
          <p className="mt-1 text-xs text-muted-foreground">后端 preview 接口不可用</p>
        )}
      </div>
    );
  }

  const strategyLabel = STRATEGY_LABELS[preview.plan.strategy] ?? preview.plan.strategy;

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm',
        className
      )}
      aria-label="成团 instantiate Active Trip"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
            <Plane className="h-4 w-4 text-primary" aria-hidden />
            成团转流 · Active Trip
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            策略：{strategyLabel}
            {usedLocalFallback && (
              <span className="ml-1 text-amber-700 dark:text-amber-300">
                · 本地预览{isFetching ? '（同步中）' : ''}
              </span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal">
          instantiate-trip
        </Badge>
      </div>

      {preview.plan.contextualCardIds && preview.plan.contextualCardIds.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
          contextualCardIds：
          {preview.plan.contextualCardIds.slice(0, 6).join(' · ')}
        </p>
      )}

      {taskPreview.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-1 text-xs font-medium text-foreground">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            协同任务预览（{taskPreview.length}）
          </p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {taskPreview.slice(0, 6).map((task) => (
              <li key={task.id}>
                · {task.title}
                {task.assigneeLabel ? ` → ${task.assigneeLabel}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {existing?.tripId && tripPath ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            已实例化 Active Trip
            {existing.instantiatedAt && (
              <span className="ml-1 tabular-nums">
                · {new Date(existing.instantiatedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </p>
          <Button size="sm" asChild>
            <Link to={tripPath}>进入 Active Trip</Link>
          </Button>
          {existing.tripId && (
            <CollaborativeTaskFlywheelPanel
              tripId={existing.tripId}
              interactive
              className="mt-2 border-0 py-0 px-0 shadow-none"
            />
          )}
        </div>
      ) : (
        <>
          {!preview.canInstantiate && preview.blockReason && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {preview.blockReason}
            </p>
          )}

          <Button
            className="mt-3 w-full sm:w-auto"
            size="sm"
            disabled={!preview.canInstantiate || instantiate.isPending}
            onClick={() => void runInstantiate()}
          >
            {instantiate.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                实例化中…
              </>
            ) : (
              '手动实例化 Active Trip'
            )}
          </Button>
        </>
      )}
    </section>
  );
}
