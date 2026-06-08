import { Link } from 'react-router-dom';
import {
  Dna,
  Download,
  ExternalLink,
  MapPin,
  Mountain,
  Package,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StartHikePlanButton } from '@/components/hiking/StartHikePlanButton';
import type { RecruitmentPostCard } from '@/types/match-square';
import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';
import { TREK_SCENARIOS } from '../lib/trek-plaza-bridge';
import { activityProfileFromScriptId, orchestrationDisplayHeadline } from '../lib/trekking-orchestration';
import { inferTrekRegionFocus } from '../lib/trekking-orchestration/trek-region-inference';
import { cn } from '@/lib/utils';

type TrekkingOrchestrationPanelProps = {
  plan: TrekkingVibeOrchestrationPlan;
  post?: Pick<
    RecruitmentPostCard,
    'routeDirectionId' | 'routeDirectionName' | 'activityProfile' | 'destination' | 'recruitmentVision'
  >;
  /** 发布页实时愿景 — 用于区域推断（优先于 post） */
  visionText?: string;
  variant?: 'preview' | 'detail' | 'manage';
  className?: string;
};

function DnaHintLine({ plan }: { plan: TrekkingVibeOrchestrationPlan }) {
  const dna = plan.dnaEvolution;
  if (!dna) return null;
  const parts: string[] = [];
  if (dna.ambiguityToleranceHint === 'minimize') parts.push('Decision DNA · 低容错熔断');
  if (dna.silentFlow) parts.push('静默流 · 行后五星同步 DNA');
  if (dna.filterPersonalityTags?.length) {
    parts.push(`拦截：${dna.filterPersonalityTags.slice(0, 3).join('、')}`);
  }
  if (!parts.length) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Dna className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {parts.join(' · ')}
    </p>
  );
}

/** §3.10 · Trekking Orchestration 预览 / 详情 / 队长管理 */
export function TrekkingOrchestrationPanel({
  plan,
  post,
  visionText,
  variant = 'detail',
  className,
}: TrekkingOrchestrationPanelProps) {
  const isPreview = variant === 'preview';
  const isManage = variant === 'manage';
  const wm = plan.worldModel;
  const profile =
    post?.activityProfile ?? activityProfileFromScriptId(plan.scriptId) ?? undefined;
  const scenarioLabel = profile ? TREK_SCENARIOS[profile]?.label : null;
  const region =
    plan.regionFocus ??
    inferTrekRegionFocus(visionText ?? post?.recruitmentVision ?? '', []);
  const headline =
    plan.displayHeadline ?? orchestrationDisplayHeadline(plan.scriptId, region) ?? scenarioLabel ?? 'Premium Trekking';
  const liveRouteId =
    post?.routeDirectionId ??
    wm.routeDirectionCandidates.find((c) => c.availability === 'live' && c.routeDirectionId)
      ?.routeDirectionId;

  return (
    <section
      className={cn(
        'rounded-xl border text-sm',
        isPreview
          ? 'border-primary/25 bg-primary/5 px-3 py-2.5'
          : 'border-border bg-muted/25 px-4 py-3.5',
        className
      )}
      aria-label="徒步编排计划"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            <Mountain className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{headline}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {plan.sceneCategory}
            </Badge>
          </div>
          {!isPreview && (
            <p className="text-xs text-muted-foreground">
              编排版本 {plan.version} · script {plan.scriptId}
            </p>
          )}
        </div>
        {!isPreview && liveRouteId != null && (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to={`/dashboard/trails/${liveRouteId}`}>
                <ExternalLink className="mr-1 h-3 w-3" />
                路线
              </Link>
            </Button>
            {!isManage && (
              <StartHikePlanButton
                size="sm"
                routeDirectionId={liveRouteId}
                routeDirectionName={post?.routeDirectionName ?? undefined}
                nameCN={post?.routeDirectionName ?? undefined}
              />
            )}
          </div>
        )}
      </div>

      {wm.offlineDataPreloadRequired && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className="gap-1 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20">
            <Download className="h-3 w-3" aria-hidden />
            离线 DEM 预载必做
            {wm.demGridMetres != null && (
              <span className="font-mono tabular-nums">{wm.demGridMetres}m</span>
            )}
          </Badge>
          {isManage && liveRouteId != null && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
              <Link to={`/dashboard/trails/${liveRouteId}`}>推送离线包给队员</Link>
            </Button>
          )}
        </div>
      )}

      {wm.routeDirectionCandidates.length > 0 && (
        <ul className="mt-2 space-y-1">
          {wm.routeDirectionCandidates.map((c) => (
            <li
              key={c.routeDirectionKey}
              className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="text-foreground/90">{c.label}</span>
              <Badge
                variant={c.availability === 'live' ? 'default' : 'secondary'}
                className="h-4 px-1.5 text-[10px] font-normal"
              >
                {c.availability === 'live' ? '已上线' : '即将上线'}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {plan.sharedGearDeficits && plan.sharedGearDeficits.length > 0 && !isPreview && (
        <div className="mt-2 space-y-1">
          <p className="flex items-center gap-1 text-[11px] font-medium text-foreground">
            <Package className="h-3 w-3" aria-hidden />
            公摊装备轧差
          </p>
          <ul className="space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {plan.sharedGearDeficits.map((g) => (
              <li key={g.item}>
                <span className="text-foreground/85">{g.item}</span>
                {g.reason ? ` — ${g.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.toolchain && plan.toolchain.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Wrench className="h-3 w-3 text-muted-foreground" aria-hidden />
          {plan.toolchain.map((t) => {
            if (t.id === 'dyl_canvas_electronic') {
              return (
                <Button key={t.id} variant="outline" size="sm" className="h-6 px-2 text-[10px] font-normal" asChild>
                  <Link to="/dashboard/trips/tools/dyl-canvas">{t.label}</Link>
                </Button>
              );
            }
            return (
              <Badge key={t.id} variant="outline" className="text-[10px] font-normal">
                {t.label}
              </Badge>
            );
          })}
        </div>
      )}

      {plan.eventStreamMilestones && plan.eventStreamMilestones.length > 0 && !isPreview && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden />
          行中节点：
          {plan.eventStreamMilestones.map((m) => m.label).join(' · ')}
        </p>
      )}

      <div className="mt-2">
        <DnaHintLine plan={plan} />
      </div>

      {isPreview && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          发布后将写入 captainPersonaSnapshot._trekkingOrchestration，成团后触发 TripNARA 编排
        </p>
      )}
    </section>
  );
}
