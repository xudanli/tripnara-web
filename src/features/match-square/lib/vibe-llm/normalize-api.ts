import type {
  TeamworkContractModel,
  VibeLlmParsePayload,
  VibeLlmParseRequest,
  VibeLlmParseResponse,
} from '@/types/vibe-llm';
import {
  chipLabelsFromPayload,
  flattenParsePayload,
  teamworkModelToPlanningStyle,
  toApiPayload,
} from '@/types/vibe-llm';
import { generateRecruitmentCopyFromVision } from '../generate-recruitment-copy';
import { buildContractHint, contractsForChips } from './contract-dictionary';
import { parseVibeIntentRuleMock } from './rule-parser';
import {
  inferSuggestedFieldsFromVision,
  normalizeSuggestedFields,
} from './suggest-fields';
import { inferBudgetCentsFromBudgetRangeString } from '../resolve-budget-gate';
import { resolveTeamworkContractModelLabel } from './teamwork-labels';
import {
  buildTrekkingOrchestrationPlan,
  normalizeTrekkingOrchestration,
} from '../trekking-orchestration';
import { normalizeRouteTemplateMatch } from '../route-template-intent';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function normalizeTeamworkContractModel(raw: unknown): TeamworkContractModel {
  const s = String(raw ?? '').trim();
  if (!s) return 'Co-Creation';
  if (/full.?service|full.?managed|full_managed|全托管/i.test(s)) return 'Full-Service';
  if (/improvis|casual.?play|casual_play|随便玩/i.test(s)) return 'Improvisational';
  if (/co.?creat|co_planning|一起策划/i.test(s)) return 'Co-Creation';
  if (s === 'Full-Service' || s === 'Full-Managed' || s === 'Co-Creation' || s === 'Improvisational' || s === 'Casual-Play') {
    return s as TeamworkContractModel;
  }
  return 'Co-Creation';
}

function resolveParseSource(record: Record<string, unknown> | null): 'rules' | 'llm' {
  if (!record) return 'rules';
  const explicit =
    record.parseSource ?? record.parse_source ?? record.source;
  if (explicit === 'llm' || explicit === 'live_llm') return 'llm';
  if (explicit === 'rules' || explicit === 'rule_mock') return 'rules';
  return 'llm';
}

function enrichPayload(payload: VibeLlmParsePayload, options?: { fromLlm?: boolean }): VibeLlmParsePayload {
  const chips = chipLabelsFromPayload(payload);
  const behavior_contracts =
    payload.behavior_contracts ??
    (payload.behavioral_contracts ?? []).flatMap((bc) =>
      bc.clauses.map((clause) => ({ tag: bc.title, clause }))
    );

  // Live LLM：不臆造契约文案，仅透传接口字段
  if (options?.fromLlm) {
    return {
      ...payload,
      behavior_contracts,
    };
  }

  const mergedContracts =
    behavior_contracts.length > 0 ? behavior_contracts : contractsForChips(chips);
  const contract_hint =
    payload.contract_hint ??
    (mergedContracts.length ? buildContractHint(mergedContracts) : undefined);

  return {
    ...payload,
    behavior_contracts: mergedContracts,
    contract_hint,
  };
}

/** 归一化 POST /vibe-llm/parse 响应 */
export function normalizeVibeLlmParseResponse(raw: unknown): VibeLlmParseResponse {
  const record = asRecord(raw);
  const parseSource = resolveParseSource(record);
  const fromLlm = parseSource === 'llm';

  const payloadRaw = record?.payload ?? record?.parse ?? record;
  const payload = enrichPayload(normalizePayload(payloadRaw, record), { fromLlm });

  const suggestedPlanningStyle =
    (record?.suggestedPlanningStyle as VibeLlmParseResponse['suggestedPlanningStyle']) ??
    (record?.suggested_planning_style as VibeLlmParseResponse['suggestedPlanningStyle']) ??
    teamworkModelToPlanningStyle(payload.teamwork_contract_model);

  const apiTeamworkLabel =
    typeof record?.teamworkContractModelLabel === 'string'
      ? record.teamworkContractModelLabel
      : typeof record?.teamwork_contract_model_label === 'string'
        ? record.teamwork_contract_model_label
        : null;

  const teamworkContractModelLabel =
    apiTeamworkLabel ??
    resolveTeamworkContractModelLabel(payload.teamwork_contract_model) ??
    '一起策划';

  const parse = flattenParsePayload(payload);

  const suggestedFromApi =
    typeof record?.suggestedItinerarySummary === 'string'
      ? record.suggestedItinerarySummary
      : typeof record?.suggested_itinerary_summary === 'string'
        ? record.suggested_itinerary_summary
        : undefined;

  const suggestedCaptainFromApi =
    typeof record?.suggestedCaptainMessage === 'string'
      ? record.suggestedCaptainMessage
      : typeof record?.suggested_captain_message === 'string'
        ? record.suggested_captain_message
        : undefined;

  const suggestedFieldsRaw = record?.suggestedFields ?? record?.suggested_fields;
  let suggestedFields = normalizeSuggestedFields(suggestedFieldsRaw);

  if (!suggestedFields && parseSource === 'rules') {
    suggestedFields = inferSuggestedFieldsFromVision(
      typeof record?.freeText === 'string' ? record.freeText : '',
      parse
    );
  }

  if (suggestedFields && suggestedFields.budgetMinCents == null && typeof payload.hard_gates.budget_range === 'string') {
    suggestedFields = {
      ...suggestedFields,
      ...inferBudgetCentsFromBudgetRangeString(payload.hard_gates.budget_range),
    };
  }

  const trekkingFromApi = normalizeTrekkingOrchestration(
    record?.trekkingOrchestration ?? record?.trekking_orchestration
  );
  const visionForOrchestration =
    typeof record?.freeText === 'string'
      ? record.freeText
      : typeof record?.text === 'string'
        ? record.text
        : '';
  const trekkingOrchestration =
    trekkingFromApi ??
    (visionForOrchestration || parse.vibe_chips.length
      ? buildTrekkingOrchestrationPlan({
          visionText: visionForOrchestration,
          vibeChips: parse.vibe_chips,
        })
      : null);

  const routeTemplateMatch = normalizeRouteTemplateMatch(
    record?.routeTemplateMatch ?? record?.route_template_match,
    {
      visionText: visionForOrchestration,
      vibeChips: parse.vibe_chips,
      trekkingOrchestration,
    }
  );

  return {
    payload,
    suggestedPlanningStyle,
    teamworkContractModelLabel,
    suggestedItinerarySummary: suggestedFromApi,
    suggestedCaptainMessage: suggestedCaptainFromApi,
    suggestedFields,
    realtime_ready: record?.realtime_ready !== false && parse.vibe_chips.length > 0,
    parseSource,
    parse,
    source: parseSource === 'llm' ? 'live_llm' : 'rule_mock',
    trekkingOrchestration,
    routeTemplateMatch,
  };
}

function normalizeHardGates(raw: unknown): VibeLlmParsePayload['hard_gates'] {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const budgetRaw = record.budget_range ?? record.budgetRange;

  let budget_range: VibeLlmParsePayload['hard_gates']['budget_range'];
  if (typeof budgetRaw === 'string') {
    budget_range = budgetRaw.trim();
  } else if (budgetRaw && typeof budgetRaw === 'object') {
    const br = budgetRaw as Record<string, unknown>;
    budget_range = {
      min: typeof br.min === 'number' ? br.min : undefined,
      max: typeof br.max === 'number' ? br.max : undefined,
    };
  }

  return {
    education_baseline: record.education_baseline as VibeLlmParsePayload['hard_gates']['education_baseline'],
    industry_preference: Array.isArray(record.industry_preference)
      ? record.industry_preference.filter((x): x is string => typeof x === 'string')
      : undefined,
    security_level: record.security_level as VibeLlmParsePayload['hard_gates']['security_level'],
    budget_range,
  };
}

function normalizePayload(raw: unknown, outer?: Record<string, unknown> | null): VibeLlmParsePayload {
  const record = asRecord(raw);
  if (!record) {
    return toApiPayload(parseVibeIntentRuleMock(''));
  }

  const chipsRaw =
    record.vibe_chips ??
    record.vibeChips ??
    record.chips ??
    outer?.vibe_chips ??
    outer?.vibeChips ??
    outer?.chips;

  let vibe_chips: VibeLlmParsePayload['vibe_chips'] = [];
  if (Array.isArray(chipsRaw)) {
    vibe_chips = chipsRaw
      .map((c, i) => {
        if (typeof c === 'string') return { id: `chip_${i}`, label: c };
        const row = c as Record<string, unknown>;
        const label = String(row.label ?? row.name ?? row.text ?? '');
        return {
          id: String(row.id ?? `chip_${i}`),
          label,
        };
      })
      .filter((c) => c.label.trim());
  }

  const slotRaw = record.slot_definitions ?? outer?.slot_definitions;
  const slot_definitions = Array.isArray(slotRaw)
    ? slotRaw.map((s, i) => {
        const row = s as Record<string, unknown>;
        return {
          slot_id: typeof row.slot_id === 'number' ? row.slot_id : i + 1,
          expected_tag: String(row.expected_tag ?? ''),
          reason: String(row.reason ?? ''),
        };
      })
    : [];

  const contractHintRaw = record.contract_hint ?? record.contractHint ?? outer?.contract_hint ?? outer?.contractHint;

  return {
    vibe_chips,
    teamwork_contract_model: normalizeTeamworkContractModel(
      record.teamwork_contract_model ?? outer?.teamwork_contract_model ?? outer?.teamworkContractModel
    ),
    hard_gates: normalizeHardGates(record.hard_gates ?? outer?.hard_gates),
    slot_definitions,
    behavioral_contracts: Array.isArray(record.behavioral_contracts)
      ? (record.behavioral_contracts as VibeLlmParsePayload['behavioral_contracts'])
      : Array.isArray(outer?.behavioral_contracts)
        ? (outer.behavioral_contracts as VibeLlmParsePayload['behavioral_contracts'])
        : undefined,
    behavior_contracts: Array.isArray(record.behavior_contracts)
      ? (record.behavior_contracts as VibeLlmParsePayload['behavior_contracts'])
      : Array.isArray(outer?.behavior_contracts)
        ? (outer.behavior_contracts as VibeLlmParsePayload['behavior_contracts'])
        : undefined,
    contract_hint: typeof contractHintRaw === 'string' ? contractHintRaw : undefined,
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
  };
}

export function buildVibeLlmParseResponse(req: VibeLlmParseRequest): VibeLlmParseResponse {
  const text = req.freeText ?? req.text ?? '';
  const internal = parseVibeIntentRuleMock(text, req.slotsNeeded ?? 3);
  const payload = toApiPayload(internal);
  const suggestedPlanningStyle = teamworkModelToPlanningStyle(internal.teamwork_contract_model);
  const copyDraft = generateRecruitmentCopyFromVision(text, {
    parse: internal,
    mbtiType: req.captainContext?.mbtiType,
    personaTitle: req.captainContext?.personaTitle,
  });

  return normalizeVibeLlmParseResponse({
    payload,
    suggestedPlanningStyle,
    teamworkContractModelLabel: resolveTeamworkContractModelLabel(internal.teamwork_contract_model),
    suggestedItinerarySummary: copyDraft?.itinerarySummary,
    suggestedCaptainMessage: copyDraft?.captainMessage,
    suggestedFields: inferSuggestedFieldsFromVision(text, internal),
    realtime_ready: internal.vibe_chips.length > 0,
    parseSource: 'rules',
    freeText: text,
    trekkingOrchestration: buildTrekkingOrchestrationPlan({
      visionText: text,
      vibeChips: internal.vibe_chips,
    }),
  });
}
