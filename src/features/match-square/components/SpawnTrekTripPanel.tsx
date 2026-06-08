import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dna, Loader2, MapPin, Rocket, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  useSpawnTrekTrip,
  useSpawnTrekTripPreview,
} from '../hooks/useMatchSquare';
import type { RecruitmentPostCard } from '@/types/match-square';
import { buildSpawnPreviewFromPost } from '../lib/trekking-orchestration/build-spawn-preview-from-post';
import { useMemo } from 'react';

type SpawnTrekTripPanelProps = {
  postId: string;
  post?: RecruitmentPostCard;
  approvedCount?: number;
  className?: string;
};

/** §3.10 · 队长成团后 spawn TripNARA 徒步计划 */
export function SpawnTrekTripPanel({
  postId,
  post,
  approvedCount = 0,
  className,
}: SpawnTrekTripPanelProps) {
  const navigate = useNavigate();
  const { data: previewApi, isLoading, isError, isFetching } = useSpawnTrekTripPreview(
    postId,
    Boolean(post?.trekkingOrchestration),
    post ?? null
  );
  const spawn = useSpawnTrekTrip();

  const localPreview = useMemo(
    () => (post ? buildSpawnPreviewFromPost(post, approvedCount) : null),
    [post, approvedCount]
  );

  const preview = previewApi ?? localPreview;
  const usedLocalFallback = !previewApi && Boolean(localPreview) && !isLoading;

  const defaultKey =
    preview?.selectedRouteDirectionKey ??
    preview?.liveCandidates.find((c) => c.recommended)?.routeDirectionKey ??
    preview?.liveCandidates[0]?.routeDirectionKey ??
    '';

  const [selectedKey, setSelectedKey] = useState<string>('');

  const activeKey = selectedKey || defaultKey;

  if (!post?.trekkingOrchestration) return null;

  if (isLoading && !preview) {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">加载 spawn 预览…</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={cn('rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive', className)}>
        spawn 预览加载失败
        {isError && (
          <p className="mt-1 text-xs text-muted-foreground">
            后端 preview 接口不可用，且本地编排数据缺失
          </p>
        )}
      </div>
    );
  }

  const alreadySpawned = preview.alreadySpawned || Boolean(post.trekSpawnState?.hikePlanId);
  const hikePlanId = preview.existingHikePlanId ?? post.trekSpawnState?.hikePlanId;

  const handleSpawn = async () => {
    const candidate = preview.liveCandidates.find((c) => c.routeDirectionKey === activeKey);
    if (!candidate?.routeDirectionId) {
      toast.error('请选择已上线的 live 路线');
      return;
    }
    try {
      const result = await spawn.mutateAsync({
        postId,
        body: {
          routeDirectionKey: candidate.routeDirectionKey,
          routeDirectionId: candidate.routeDirectionId,
        },
        post,
      });
      if (!result.success) {
        toast.error(result.message ?? 'spawn 失败');
        return;
      }
      toast.success(result.message ?? '徒步计划已创建');
      if (result.hikePlanId) {
        navigate(`/dashboard/trails/prep/${result.hikePlanId}`);
      }
    } catch {
      toast.error('spawn 徒步计划失败');
    }
  };

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="成团 spawn 徒步计划"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
            <Rocket className="h-4 w-4 text-primary" aria-hidden />
            成团 · TripNARA 编排
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            选择 live 路线 → HikingPlan + hard-trek hook + offline pack
            {usedLocalFallback && (
              <span className="ml-1 text-amber-700 dark:text-amber-300">
                · 本地编排预览{isFetching ? '（同步中）' : ''}
              </span>
            )}
          </p>
        </div>
        {preview.offlineDataPreloadRequired && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Download className="h-3 w-3" />
            DEM {preview.demGridMetres ?? '—'}m
          </Badge>
        )}
      </div>

      {alreadySpawned && hikePlanId ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">已 spawn 徒步计划</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to={`/dashboard/trails/prep/${hikePlanId}`}>进入准备页</Link>
            </Button>
            {post.trekSpawnState?.routeDirectionId != null && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/dashboard/trails/${post.trekSpawnState.routeDirectionId}`}>
                  离线包 / 路线
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {!preview.canSpawn && preview.blockReason && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{preview.blockReason}</p>
          )}

          {preview.liveCandidates.length > 0 && (
            <div className="mt-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Live 路线（可 spawn）</Label>
              <RadioGroup value={activeKey} onValueChange={setSelectedKey} className="gap-2">
                {preview.liveCandidates.map((c) => (
                  <label
                    key={c.routeDirectionKey}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
                  >
                    <RadioGroupItem value={c.routeDirectionKey} id={c.routeDirectionKey} />
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-xs">{c.label}</span>
                    <Badge className="h-4 text-[10px]">已上线</Badge>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {preview.plannedCandidates.length > 0 && (
            <ul className="mt-2 space-y-1">
              {preview.plannedCandidates.map((c) => (
                <li
                  key={c.routeDirectionKey}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-70"
                >
                  <MapPin className="h-3 w-3" />
                  {c.label}
                  <Badge variant="secondary" className="h-4 text-[10px]">
                    即将上线
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {preview.preferenceEvolutionReasonsPlanned &&
            preview.preferenceEvolutionReasonsPlanned.length > 0 && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Dna className="h-3.5 w-3.5" aria-hidden />
                spawn 后将 schedule Decision DNA：
                {preview.preferenceEvolutionReasonsPlanned.join(' · ')}
              </p>
            )}

          <Button
            className="mt-3 w-full sm:w-auto"
            size="sm"
            disabled={!preview.canSpawn || spawn.isPending || !activeKey}
            onClick={handleSpawn}
          >
            {spawn.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                编排中…
              </>
            ) : (
              '成团并生成徒步计划'
            )}
          </Button>
        </>
      )}
    </section>
  );
}
