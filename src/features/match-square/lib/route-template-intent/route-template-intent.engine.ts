import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';
import type {
  RouteTemplateIntentMatchPlan,
  RouteTemplateMatchConfidence,
  RouteTemplatePrimaryMatch,
} from '@/types/route-template-intent';
import {
  ROUTE_TEMPLATE_CATALOG,
  type RouteTemplateCatalogEntry,
} from './route-template-intent-bindings.config';

export type BuildRouteTemplateMatchInput = {
  visionText: string;
  vibeChips?: string[];
  trekkingOrchestration?: TrekkingVibeOrchestrationPlan | null;
};

function scoreCatalogEntry(
  entry: RouteTemplateCatalogEntry,
  blob: string,
  orchestration?: TrekkingVibeOrchestrationPlan | null
): number {
  let score = 0;
  const maxKeyword = entry.intentKeywords.length;

  for (const kw of entry.intentKeywords) {
    if (blob.includes(kw.toLowerCase()) || new RegExp(kw, 'i').test(blob)) {
      score += 100 / maxKeyword;
    }
  }

  if (orchestration) {
    if (
      orchestration.scriptId === entry.scriptId ||
      orchestration.recruitmentScriptId === entry.scriptId
    ) {
      score += 12;
    }
    const candidateKeys = orchestration.worldModel.routeDirectionCandidates.map(
      (c) => c.routeDirectionKey
    );
    if (candidateKeys.includes(entry.routeDirectionKey)) {
      score += 18;
    }
  }

  return Math.min(100, Math.round(score));
}

function confidenceFromPercent(percent: number): RouteTemplateMatchConfidence | null {
  if (percent >= 85) return 'highlight';
  if (percent >= 60) return 'suggest';
  return null;
}

function toPrimaryMatch(
  entry: RouteTemplateCatalogEntry,
  matchPercent: number
): RouteTemplatePrimaryMatch {
  const confidence = confidenceFromPercent(matchPercent)!;
  return {
    catalogId: entry.catalogId,
    routeDirectionName: entry.routeDirectionName,
    durationDays: entry.durationDays,
    titleZh: entry.titleZh,
    matchPercent,
    confidence,
    launchRecruitmentAction: 'confirm_template',
    slotAugmentations: entry.slotAugmentations,
  };
}

/** 去掉与 primary 重复的 suggestions（API 偶发重复推送） */
export function dedupeRouteTemplateSuggestions(
  primary: RouteTemplatePrimaryMatch | null | undefined,
  suggestions: RouteTemplatePrimaryMatch[] | undefined
): RouteTemplatePrimaryMatch[] {
  if (!suggestions?.length) return [];
  if (!primary) return suggestions;

  const seen = new Set<string>([primary.catalogId]);
  return suggestions.filter((s) => {
    if (seen.has(s.catalogId)) return false;
    if (s.catalogId === primary.catalogId) return false;
    if (s.titleZh === primary.titleZh && s.matchPercent === primary.matchPercent) return false;
    seen.add(s.catalogId);
    return true;
  });
}

/** 纯函数 Intent-to-Template 检索 — API 未返回时客户端兜底 */
export function buildRouteTemplateMatchPlan(
  input: BuildRouteTemplateMatchInput
): RouteTemplateIntentMatchPlan | null {
  const blob = [input.visionText, ...(input.vibeChips ?? [])].join(' ').toLowerCase();
  if (blob.trim().length < 8) return null;

  const scored = ROUTE_TEMPLATE_CATALOG.map((entry) => ({
    entry,
    percent: scoreCatalogEntry(entry, blob, input.trekkingOrchestration),
  }))
    .filter((s) => confidenceFromPercent(s.percent))
    .sort((a, b) => b.percent - a.percent);

  if (!scored.length) return null;

  const [top, ...rest] = scored;
  const primaryMatch = toPrimaryMatch(top.entry, top.percent);
  const suggestions = dedupeRouteTemplateSuggestions(
    primaryMatch,
    rest
      .filter((s) => s.percent >= 60 && s.entry.catalogId !== top.entry.catalogId)
      .slice(0, 2)
      .map((s) => toPrimaryMatch(s.entry, s.percent))
  );

  const associationHint =
    primaryMatch.confidence === 'highlight'
      ? `🗺️ AI 已为你一键关联最佳路线模板：《${primaryMatch.titleZh}》`
      : `🗺️ 推荐路线模板：《${primaryMatch.titleZh}》（匹配 ${primaryMatch.matchPercent}%）`;

  return {
    version: 'route_template_intent_v1',
    associationHint,
    primaryMatch,
    suggestions,
  };
}
