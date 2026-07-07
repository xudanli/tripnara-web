import { ItineraryDayItemsCardList } from '@/components/agent/OrchestrationItineraryPreview';
import { ItineraryAdjustExperienceEvidencePanel } from '@/components/agent/ItineraryAdjustExperienceEvidencePanel';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import type { ItineraryAdjustResult } from '@/lib/itinerary-adjust-response';
import {
  itineraryAdjustBodyContent,
  itineraryAdjustResultTitle,
  resolveItineraryAdjustScheduleDays,
} from '@/lib/itinerary-adjust-response';
import { cn } from '@/lib/utils';

export interface ItineraryAdjustResultCardProps {
  result: ItineraryAdjustResult;
  autoApplied?: boolean;
  autoApplyReason?: string;
  /** POI_SLOT_FILL：展示全部含条目的稀疏日 */
  multiDayAppend?: boolean;
  debugUiDefaults?: boolean;
  /** 当轮 payload.timeline → 草案日程卡片（时段） */
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  fallbackTimelineDayBlocks?: ItineraryDayItemsBlock[];
  poiCardsByDay?: AgentPoiDayBlock[];
  /** answer_text 正文兜底（optimization / rationale 缺失时） */
  supplementaryAnswerText?: string;
  className?: string;
}

/**
 * ITINERARY_ADJUST 改排结果卡（四段）：
 * 1. 角标 + 目标日
 * 2. 正文：rationale_bullets_zh → optimization_summary_zh → answer_text
 * 3. 时段：draft_schedule_zh + 草案日程卡片
 * 4. 操作：apply_hint_zh（按钮由 AgentChat 渲染）
 *
 * 勿拼接 route_context_zh / apply_confirmation_lines。
 */
export function ItineraryAdjustResultCard({
  result,
  autoApplied,
  autoApplyReason,
  multiDayAppend,
  debugUiDefaults,
  timelineDayBlocks,
  fallbackTimelineDayBlocks,
  poiCardsByDay,
  supplementaryAnswerText,
  className,
}: ItineraryAdjustResultCardProps) {
  const isApplied = autoApplied === true || result.applied === true;
  const badge =
    result.status_label_zh?.trim() ||
    (isApplied ? '已更新行程' : '草案待确认');
  const title = itineraryAdjustResultTitle(result);
  const body = itineraryAdjustBodyContent(result, supplementaryAnswerText);
  const scheduleDays = resolveItineraryAdjustScheduleDays({
    timelineDayBlocks,
    fallbackTimelineDayBlocks,
    poiCardsByDay,
    targetDateIso: result.target_date_iso,
    includeAllSparseDays: multiDayAppend === true,
  });
  const hasScheduleCards = scheduleDays.some((d) => (d.items?.length ?? 0) > 0);
  const draftScheduleZh = result.draft_schedule_zh?.trim();
  const applyHint =
    result.apply_hint_zh?.trim() ||
    (isApplied ? '左侧时间轴已同步。' : undefined);
  const experienceValidation = result.experience_validation;

  return (
    <div
      className={cn(
        'mb-3 rounded-lg border px-3 py-2.5 text-xs',
        isApplied
          ? 'border-gate-allow-border/90 bg-gate-allow/80 text-gate-allow-foreground dark:border-gate-allow-border/60 dark:bg-gate-allow/30 dark:text-gate-allow-foreground'
          : 'border-amber-200/90 bg-amber-50/80 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      {/* 1. 角标 + 目标日 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
            isApplied
              ? 'border-gate-allow-border/80 bg-gate-allow/80 text-gate-allow-foreground dark:border-gate-allow-border dark:bg-gate-allow/40 dark:text-gate-allow-foreground'
              : 'border-amber-300/80 bg-amber-100/80 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100'
          )}
        >
          {badge}
        </span>
        {title ? (
          <span className="text-[11px] font-semibold text-foreground/95">{title}</span>
        ) : null}
        {debugUiDefaults && result.corridor_fallback_level ? (
          <span className="font-mono text-[9px] text-muted-foreground">
            {result.corridor_fallback_level}
          </span>
        ) : null}
      </div>

      {/* 2. 正文 */}
      {body?.kind === 'bullets' ? (
        <ul className="mt-2 space-y-1 pl-3.5 text-[11px] leading-relaxed list-disc text-foreground/90">
          {body.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : body?.kind === 'text' ? (
        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90">
          {body.text}
        </p>
      ) : null}

      {experienceValidation ? (
        <ItineraryAdjustExperienceEvidencePanel
          validation={experienceValidation}
          debugUiDefaults={debugUiDefaults}
          className="mt-2"
        />
      ) : null}

      {/* 3. 时段：draft_schedule_zh + 草案日程卡片 */}
      {draftScheduleZh || hasScheduleCards ? (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/70">
            草案日程
          </p>
          {draftScheduleZh ? (
            <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-background/80 px-2.5 py-2 font-sans text-[11px] leading-relaxed text-foreground/90">
              {draftScheduleZh}
            </pre>
          ) : null}
          {hasScheduleCards ? (
            <ItineraryDayItemsCardList
              days={scheduleDays}
              poiDayBlocks={poiCardsByDay}
              className="mt-0 space-y-2"
            />
          ) : null}
        </div>
      ) : null}

      {autoApplyReason === 'unresolved_places' ? (
        <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200">
          部分地点无法写入，请确认后重试。
        </p>
      ) : null}

      {/* 4. 操作提示（按钮在 AgentChat） */}
      {applyHint ? (
        <p
          className={cn(
            'mt-2 text-[10px] leading-snug',
            isApplied ? 'text-gate-allow-foreground/75 dark:text-gate-allow-foreground/75' : 'text-amber-900/70 dark:text-amber-200/70'
          )}
        >
          {applyHint}
        </p>
      ) : null}
    </div>
  );
}
