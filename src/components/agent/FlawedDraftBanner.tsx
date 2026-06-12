/**
 * route_and_run：flawed_draft_v1 — SUCCESS 但未完全 VERIFIED 的全宽 Banner
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  flawedDraftHeadline,
  flawedDraftReasonLabel,
  flawedDraftSubheadline,
} from '@/lib/flawed-draft-ui';
import type { FlawedDraftDescriptorV1 } from '@/types/flawed-draft';
import { AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import { FlawedDraftExplainPanel } from '@/components/agent/FlawedDraftExplainPanel';

export interface FlawedDraftBannerProps {
  draft: FlawedDraftDescriptorV1;
  disabled?: boolean;
  debugUiDefaults?: boolean;
  className?: string;
  onConfirmAdjust?: () => void;
  onViewConstraints?: () => void;
}

export function FlawedDraftBanner({
  draft,
  disabled,
  debugUiDefaults,
  className,
  onConfirmAdjust,
  onViewConstraints,
}: FlawedDraftBannerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const headline = flawedDraftHeadline(draft);
  const subhead = flawedDraftSubheadline(draft);
  const showAdjustCta = draft.user_action_recommended === true;
  const showConstraintsCta = draft.gate_status === 'ADJUST_REQUIRED';

  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-amber-500/45 bg-amber-50/90 px-3 py-2.5 dark:border-amber-600/40 dark:bg-amber-950/30',
        className
      )}
      role="alert"
    >
      <div className="flex flex-wrap items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              瑕疵草案 · 尚未完全验证
            </span>
            <Badge variant="outline" className="text-[10px] h-5 border-amber-600/40 text-amber-900">
              草案
            </Badge>
            {draft.gate_status ? (
              <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                {draft.gate_status}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/90">
            {headline}
          </p>
          {subhead ? (
            <p className="mt-0.5 text-[11px] text-amber-900/80 dark:text-amber-200/80">{subhead}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 pl-6">
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-7 rounded-full text-[11px] gap-1 border-amber-600/30 bg-background/60 [&[data-state=open]_svg]:rotate-90"
            >
              查看详情
              <ChevronRight className="h-3 w-3 transition-transform" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <FlawedDraftExplainPanel draft={draft} debugUiDefaults={debugUiDefaults} embedded />
          </CollapsibleContent>
        </Collapsible>

        {showAdjustCta ? (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            className="h-7 rounded-full text-[11px]"
            onClick={onConfirmAdjust}
          >
            确认并继续调整
          </Button>
        ) : null}

        {showConstraintsCta ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className="h-7 rounded-full text-[11px] gap-1"
            onClick={() => {
              setDetailsOpen(true);
              onViewConstraints?.();
            }}
          >
            <ShieldAlert className="h-3 w-3" aria-hidden />
            查看约束说明
          </Button>
        ) : null}
      </div>

      {!detailsOpen && draft.reasons.length > 1 ? (
        <ul className="mt-2 pl-6 space-y-0.5 text-[11px] text-amber-900/85 dark:text-amber-100/85">
          {draft.reasons.slice(0, 2).map((reason) => (
            <li key={reason.code} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
              <span>{flawedDraftReasonLabel(reason)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
