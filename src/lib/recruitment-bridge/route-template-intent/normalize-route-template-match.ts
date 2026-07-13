import type { RouteTemplateIntentMatchPlan } from '@/types/route-template-intent';
import type {
  RouteTemplateIntentMatchPlan,
  RouteTemplateMatchConfidence,
  RouteTemplatePrimaryMatch,
  RouteTemplateSlotAugmentation,
} from '@/types/route-template-intent';
import { buildRouteTemplateMatchPlan, dedupeRouteTemplateSuggestions } from './route-template-intent.engine';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function normalizeConfidence(raw: unknown): RouteTemplateMatchConfidence {
  return raw === 'suggest' ? 'suggest' : 'highlight';
}

function normalizeSlotAugmentations(raw: unknown): RouteTemplateSlotAugmentation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      return {
        slotRole: String(r.slotRole ?? r.slot_role ?? ''),
        expectedTagSuffix: String(r.expectedTagSuffix ?? r.expected_tag_suffix ?? ''),
        reason: String(r.reason ?? ''),
      };
    })
    .filter((s): s is RouteTemplateSlotAugmentation => Boolean(s?.expectedTagSuffix));
}

function normalizePrimaryMatch(raw: unknown): RouteTemplatePrimaryMatch | null {
  const r = asRecord(raw);
  if (!r) return null;
  const titleZh = String(r.titleZh ?? r.title_zh ?? '');
  const catalogId = String(r.catalogId ?? r.catalog_id ?? '');
  if (!titleZh || !catalogId) return null;

  const matchPercent =
    typeof r.matchPercent === 'number'
      ? r.matchPercent
      : typeof r.match_percent === 'number'
        ? r.match_percent
        : 0;

  return {
    catalogId,
    routeDirectionName: String(r.routeDirectionName ?? r.route_direction_name ?? ''),
    durationDays:
      typeof r.durationDays === 'number'
        ? r.durationDays
        : typeof r.duration_days === 'number'
          ? r.duration_days
          : undefined,
    titleZh,
    matchPercent,
    confidence: normalizeConfidence(r.confidence),
    launchRecruitmentAction:
      (r.launchRecruitmentAction as RouteTemplatePrimaryMatch['launchRecruitmentAction']) ??
      (r.launch_recruitment_action as RouteTemplatePrimaryMatch['launchRecruitmentAction']) ??
      'confirm_template',
    slotAugmentations: normalizeSlotAugmentations(
      r.slotAugmentations ?? r.slot_augmentations
    ),
  };
}

/** 归一化 API `routeTemplateMatch` / `route_template_match` */
export function normalizeRouteTemplateMatch(
  raw: unknown,
  fallback?: {
    visionText?: string;
    vibeChips?: string[];
    trekkingOrchestration?: Record<string, unknown> | null;
  }
): RouteTemplateIntentMatchPlan | null {
  const record = asRecord(raw);
  if (record) {
    const primaryRaw = record.primaryMatch ?? record.primary_match;
    const primaryMatch = normalizePrimaryMatch(primaryRaw);
    const suggestionsRaw = record.suggestions;
    const suggestions = Array.isArray(suggestionsRaw)
      ? suggestionsRaw
          .map(normalizePrimaryMatch)
          .filter((s): s is RouteTemplatePrimaryMatch => s != null)
      : [];

    if (primaryMatch) {
      return {
        version: 'route_template_intent_v1',
        associationHint:
          typeof record.associationHint === 'string'
            ? record.associationHint
            : typeof record.association_hint === 'string'
              ? record.association_hint
              : undefined,
        primaryMatch,
        suggestions: dedupeRouteTemplateSuggestions(primaryMatch, suggestions),
      };
    }
  }

  if (fallback?.visionText) {
    return buildRouteTemplateMatchPlan({
      visionText: fallback.visionText,
      vibeChips: fallback.vibeChips,
      trekkingOrchestration: fallback.trekkingOrchestration,
    });
  }

  return null;
}
