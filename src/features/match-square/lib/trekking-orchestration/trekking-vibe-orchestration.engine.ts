import type { TrekActivityProfile } from '@/types/match-square';
import type {
  TrekkingRecruitmentScriptId,
  TrekkingVibeOrchestrationPlan,
} from '@/types/trekking-vibe-orchestration';
import { inferActivityProfileFromText } from '../trek-plaza-bridge';
import { PREMIUM_TREKKING_SCENE } from './premium-trekking.config';
import { TREKKING_SCRIPT_WORLD_BINDINGS } from './trekking-vibe-world-model.config';
import { scriptIdFromActivityProfile } from './script-id-map';
import {
  filterRouteCandidatesForRegion,
  inferTrekRegionFocus,
  orchestrationDisplayHeadline,
} from './trek-region-inference';

export type BuildTrekkingOrchestrationInput = {
  visionText: string;
  vibeChips?: string[];
  activityProfile?: TrekActivityProfile | null;
  routeDirectionId?: number | null;
  routeDirectionName?: string | null;
};

function inferScriptIdFromVision(text: string, chips: string[]): TrekkingRecruitmentScriptId | null {
  const blob = [text, ...chips].join(' ');
  if (/速攀|Fast\s*&\s*Light|心率|三尖|十里琅珰|法喜寺|默契.*沉默/i.test(blob)) {
    return 'weekend_fast_light_trek';
  }
  if (/DYL|设计人生|班味|雨崩|乌孙|马帮|轻装|星空|疗愈/i.test(blob)) {
    return 'light_trek_dyl_retreat';
  }
  if (/重装|自负重|DEM|数字高程|LNT|暴风雪|离线.*高程|Landmannalaugar|Laugavegur|兰格维格/i.test(blob)) {
    return 'chuanxi_heavy_trek';
  }
  return null;
}

function resolveScriptId(input: BuildTrekkingOrchestrationInput): TrekkingRecruitmentScriptId | null {
  const fromProfile = scriptIdFromActivityProfile(input.activityProfile ?? undefined);
  if (fromProfile) return fromProfile;

  const chips = input.vibeChips ?? [];
  const fromVision = inferScriptIdFromVision(input.visionText, chips);
  if (fromVision) return fromVision;

  const fromInfer = inferActivityProfileFromText(input.visionText);
  return scriptIdFromActivityProfile(fromInfer ?? undefined);
}

/** 纯函数编排计划生成 — 规则/mock 兜底，Live LLM 可覆盖 */
export function buildTrekkingOrchestrationPlan(
  input: BuildTrekkingOrchestrationInput
): TrekkingVibeOrchestrationPlan | null {
  const scriptId = resolveScriptId(input);
  if (!scriptId) return null;

  const binding = TREKKING_SCRIPT_WORLD_BINDINGS[scriptId];
  const region = inferTrekRegionFocus(input.visionText, input.vibeChips ?? []);
  const filteredCandidates = filterRouteCandidatesForRegion(
    binding.worldModel.routeDirectionCandidates,
    region
  );

  const candidates = filteredCandidates.map((c) => {
    if (
      input.routeDirectionId != null &&
      c.availability === 'live' &&
      input.routeDirectionName
    ) {
      return { ...c, routeDirectionId: input.routeDirectionId, label: input.routeDirectionName };
    }
    if (input.routeDirectionId != null && c.availability === 'planned') {
      return { ...c, routeDirectionId: input.routeDirectionId };
    }
    return c;
  });

  return {
    version: 'trekking_orchestration_v1',
    scriptId,
    sceneCategory: PREMIUM_TREKKING_SCENE,
    recruitmentScriptId: scriptId,
    recruitmentSceneCategory: PREMIUM_TREKKING_SCENE,
    regionFocus: region,
    displayHeadline: orchestrationDisplayHeadline(scriptId, region),
    worldModel: {
      ...binding.worldModel,
      routeDirectionCandidates: candidates,
    },
    sharedGearDeficits: binding.sharedGearDeficits,
    eventStreamMilestones: binding.eventStreamMilestones,
    toolchain: binding.toolchain,
    dnaEvolution: binding.dnaEvolution,
  };
}

export function isPremiumTrekkingVision(text: string, chips: string[] = []): boolean {
  return resolveScriptId({ visionText: text, vibeChips: chips }) != null;
}
