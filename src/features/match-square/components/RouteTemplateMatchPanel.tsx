import { MapPinned, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  RouteTemplateIntentMatchPlan,
  RouteTemplatePrimaryMatch,
} from '@/types/route-template-intent';
import { dedupeRouteTemplateSuggestions } from '../lib/route-template-intent/route-template-intent.engine';
import { cn } from '@/lib/utils';

type RouteTemplateMatchPanelProps = {
  plan: RouteTemplateIntentMatchPlan;
  variant?: 'preview' | 'detail';
  onConfirmTemplate?: (match: RouteTemplatePrimaryMatch) => void;
  className?: string;
};

function MatchCard({
  match,
  highlighted,
  onConfirm,
}: {
  match: RouteTemplatePrimaryMatch;
  highlighted?: boolean;
  onConfirm?: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        highlighted
          ? 'border-sky-500/30 bg-sky-500/8'
          : 'border-border/70 bg-background/60'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug text-foreground">{match.titleZh}</p>
          <p className="text-[11px] text-muted-foreground">
            {match.routeDirectionName}
            {match.durationDays != null && (
              <span className="ml-1.5 tabular-nums">· {match.durationDays} 日</span>
            )}
          </p>
        </div>
        <Badge
          variant={match.confidence === 'highlight' ? 'default' : 'secondary'}
          className="shrink-0 tabular-nums"
        >
          {match.matchPercent}%
        </Badge>
      </div>

      {match.slotAugmentations && match.slotAugmentations.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {match.slotAugmentations.map((s) => (
            <li key={`${s.slotRole}-${s.expectedTagSuffix}`}>
              <span className="text-foreground/85">🧩 {s.expectedTagSuffix}</span>
              {s.reason ? ` — ${s.reason}` : ''}
            </li>
          ))}
        </ul>
      )}

      {highlighted && onConfirm && match.launchRecruitmentAction === 'confirm_template' && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 h-7 text-xs"
          onClick={onConfirm}
        >
          确认绑定此模板
        </Button>
      )}
    </div>
  );
}

/** §3.11 · 路线模板 Intent 匹配预览 */
export function RouteTemplateMatchPanel({
  plan,
  variant = 'preview',
  onConfirmTemplate,
  className,
}: RouteTemplateMatchPanelProps) {
  const isPreview = variant === 'preview';
  const primary = plan.primaryMatch;
  if (!primary) return null;

  const suggestions = dedupeRouteTemplateSuggestions(primary, plan.suggestions);

  return (
    <section
      className={cn(
        'rounded-xl border text-sm',
        isPreview
          ? 'border-sky-500/25 bg-sky-500/5 px-3 py-2.5'
          : 'border-border bg-muted/25 px-4 py-3.5',
        className
      )}
      aria-label="路线模板匹配"
    >
      <div className="flex items-start gap-2">
        <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          {plan.associationHint && (
            <p className="text-xs font-medium leading-snug text-foreground">{plan.associationHint}</p>
          )}
          <MatchCard
            match={primary}
            highlighted={primary.confidence === 'highlight'}
            onConfirm={
              onConfirmTemplate && isPreview
                ? () => onConfirmTemplate(primary)
                : undefined
            }
          />
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3" aria-hidden />
                其它推荐
              </p>
              {suggestions.map((s) => (
                <MatchCard key={s.catalogId} match={s} />
              ))}
            </div>
          )}
          {isPreview && !onConfirmTemplate && (
            <p className="text-[10px] text-muted-foreground">
              模板 GPS / 营地 / 预算将在 Phase 2 确认后自动回填（当前为预览骨架）
            </p>
          )}
          {isPreview && onConfirmTemplate && (
            <p className="text-[10px] text-muted-foreground">
              点击「确认绑定此模板」将自动回填行程、预算与徒步编排
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
