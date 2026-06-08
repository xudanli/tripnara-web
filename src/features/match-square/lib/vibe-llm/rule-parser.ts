import type {
  TeamworkContractModel,
  VibeEducationBaseline,
  VibeHardGates,
  VibeLlmParseRequest,
  VibeLlmParseResponse,
  VibeLlmParseResult,
} from '@/types/vibe-llm';
import { buildContractHint, contractsForChips } from './contract-dictionary';
import { buildVibeLlmParseResponse } from './normalize-api';
import {
  chipsFromLexicon,
  inferTeamworkContractModelFromText,
  matchLexiconRules,
  slotDefinitionsFromLexicon,
} from './lexicon';

function inferContractModel(text: string): TeamworkContractModel {
  return inferTeamworkContractModelFromText(text) ?? 'Co-Creation';
}

function inferHardGates(text: string): VibeHardGates {
  const gates: VibeHardGates = { security_level: 'Standard' };

  if (/硕士|研究生/i.test(text)) gates.education_baseline = 'Master';
  else if (/博士/i.test(text)) gates.education_baseline = 'Doctorate';
  else if (/本科|学士|学历|985|211/i.test(text)) gates.education_baseline = 'Bachelor';

  const industries: string[] = [];
  if (/大厂|互联网|科技|程序员|产品|工程师|理工科/i.test(text)) {
    industries.push('泛科技/互联网');
  }
  if (/金融|咨询|投行|高管|白领/i.test(text)) industries.push('金融/咨询');
  if (/制造|工厂|工业/i.test(text)) industries.push('知名制造集团');
  if (industries.length) gates.industry_preference = industries;

  if (/靠谱|不掉链子|大厂|学历|硕士|授信|认证|芝麻分|高管|白领/i.test(text)) {
    gates.security_level = 'High';
  }

  if (/人均\s*(\d+)\s*[wW万]\s*\+|(\d+)\s*[wW]\s*\+/i.test(text)) {
    const m = text.match(/人均\s*(\d+)\s*[wW万]\s*\+|(\d+)\s*[wW]\s*\+/i);
    const w = Number(m?.[1] ?? m?.[2] ?? 5);
    let line = `¥${w * 10000}+ / 人`;
    if (/路线.*全包|预约.*全包|住宿.*全包|我全包|队长全包|已订好/i.test(text)) {
      line += ' · 队长全包';
    }
    gates.budget_range = line;
  } else if (/人均.*[23]w|三万|顶奢|奢华/i.test(text)) {
    gates.budget_range = { min: 20000, max: undefined };
  }

  const rmbRange = text.match(/[¥￥]?\s*(\d{3,5})\s*[-~到至]\s*(\d{3,5})\s*\/?\s*人?/);
  if (rmbRange) {
    gates.budget_range = { min: Number(rmbRange[1]), max: Number(rmbRange[2]) };
  } else if (/2000\s*[-~到至]\s*5000|¥2000-5000/i.test(text)) {
    gates.budget_range = { min: 2000, max: 5000 };
  }

  if (/爹味|爱说教|无效.*八卦|职场抱怨/i.test(text)) {
    gates.security_level = 'High';
    if (!gates.industry_preference?.length) {
      gates.industry_preference = ['高能白领/深度神交'];
    }
  }

  return gates;
}

/** 规则引擎 mock — 与 LLM 输出 schema 对齐，API 未就绪时使用 */
export function parseVibeIntentRuleMock(
  text: string,
  slotsNeeded = 3
): VibeLlmParseResult {
  const trimmed = text.trim();
  const matched = matchLexiconRules(trimmed);
  const vibe_chips = chipsFromLexicon(trimmed);

  if (vibe_chips.length === 0 && trimmed.length >= 8) {
    vibe_chips.push('🌏 自由探索');
  }

  const teamwork_contract_model = inferContractModel(trimmed);
  const hard_gates = inferHardGates(trimmed);
  const slot_definitions = slotDefinitionsFromLexicon(trimmed, slotsNeeded);
  const behavior_contracts = contractsForChips(vibe_chips);
  const contract_hint = buildContractHint(behavior_contracts);

  return {
    vibe_chips,
    teamwork_contract_model,
    hard_gates,
    slot_definitions,
    behavior_contracts,
    contract_hint,
    confidence: Math.min(0.95, 0.45 + vibe_chips.length * 0.12),
  };
}

export function parseVibeIntentRequest(req: VibeLlmParseRequest): VibeLlmParseResponse {
  return buildVibeLlmParseResponse(req);
}

export function hardGatesToPreferences(gates: VibeHardGates): string {
  const parts: string[] = [];
  if (gates.education_baseline && gates.education_baseline !== 'None') {
    parts.push(`学历底线：${gates.education_baseline} 及以上（需授信验证）`);
  }
  if (gates.industry_preference?.length) {
    parts.push(`行业偏好：${gates.industry_preference.join('、')}`);
  }
  if (gates.security_level === 'High') {
    parts.push('强授信：学信网 / 企业邮箱验证');
  }
  return parts.join(' · ');
}
