import type {
  GuardianNegotiationConsensus,
  GuardianNegotiationPersona,
  GuardianNegotiationResult,
  GuardianNegotiationStance,
} from '@/types/readiness-guardian-negotiation';
import type { PersonaType } from '@/lib/persona-icons';

const VALID_STANCES = new Set<GuardianNegotiationStance>([
  'SUPPORT',
  'CAUTION',
  'OPPOSE',
  'NEUTRAL',
]);
const VALID_CONSENSUS = new Set<GuardianNegotiationConsensus>([
  'ALIGNED',
  'SPLIT',
  'BLOCKED',
]);

function parsePersona(raw: unknown): GuardianNegotiationPersona | null {
  const camel = String(raw ?? '').trim();
  if (!camel) return null;
  if (camel === 'Abu') return 'ABU';
  if (camel === 'DrDre') return 'DR_DRE';
  if (camel === 'Neptune') return 'NEPTUNE';
  const upper = camel.toUpperCase().replace(/\./g, '_').replace(/-/g, '_');
  if (upper === 'ABU') return 'ABU';
  if (upper === 'NEPTUNE') return 'NEPTUNE';
  if (upper === 'DR_DRE' || upper === 'DRDRE') return 'DR_DRE';
  return null;
}

function parseStance(raw: unknown): GuardianNegotiationStance {
  const value = String(raw ?? 'NEUTRAL').toUpperCase() as GuardianNegotiationStance;
  return VALID_STANCES.has(value) ? value : 'NEUTRAL';
}

function parseConsensus(raw: unknown): GuardianNegotiationConsensus | undefined {
  if (raw == null) return undefined;
  const value = String(raw).toUpperCase() as GuardianNegotiationConsensus;
  return VALID_CONSENSUS.has(value) ? value : undefined;
}

function parseScope(raw: unknown): GuardianNegotiationResult['scope'] | undefined {
  if (raw == null) return undefined;
  const value = String(raw).toLowerCase().replace(/-/g, '_');
  if (value === 'trip' || value === 'itinerary' || value === 'whole_trip') return 'trip';
  if (value === 'day' || value === 'daily') return 'day';
  if (value === 'repair' || value === 'option' || value === 'patch') return 'repair';
  return undefined;
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function normalizeGuardianNegotiationPersonaView(
  raw: unknown
): GuardianNegotiationResult['personas'][number] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const persona = parsePersona(o.persona ?? o.guardian ?? o.guardian_persona);
  const message = String(o.message ?? o.summary ?? '').trim();
  if (!persona || !message) return null;
  return {
    persona,
    stance: parseStance(o.stance ?? o.verdict),
    message,
    suggestion: o.suggestion != null ? String(o.suggestion) : undefined,
    highlights: parseStringArray(o.highlights ?? o.key_points),
  };
}

/** snake_case / camelCase → GuardianNegotiationResult */
export function normalizeGuardianNegotiationResult(
  raw: unknown
): GuardianNegotiationResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const personasRaw = o.personas ?? o.persona_views ?? o.guardian_views;
  if (!Array.isArray(personasRaw)) return null;

  const personas = personasRaw
    .map(normalizeGuardianNegotiationPersonaView)
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (personas.length === 0) return null;

  return {
    scope: parseScope(o.scope ?? o.negotiation_scope ?? o.negotiationScope),
    consensus: parseConsensus(o.consensus ?? o.consensus_level),
    summary: o.summary != null ? String(o.summary) : undefined,
    personas,
    userActionRequired: parseStringArray(
      o.userActionRequired ?? o.user_action_required
    ),
    analyzedAt:
      o.analyzedAt != null
        ? String(o.analyzedAt)
        : o.analyzed_at != null
          ? String(o.analyzed_at)
          : undefined,
  };
}

export function guardianPersonaToAvatarType(
  persona: GuardianNegotiationPersona
): PersonaType {
  return persona;
}

export const GUARDIAN_STANCE_LABEL_ZH: Record<GuardianNegotiationStance, string> = {
  SUPPORT: '支持',
  CAUTION: '谨慎',
  OPPOSE: '反对',
  NEUTRAL: '中立',
};

export const GUARDIAN_STANCE_LABEL_EN: Record<GuardianNegotiationStance, string> = {
  SUPPORT: 'Support',
  CAUTION: 'Caution',
  OPPOSE: 'Oppose',
  NEUTRAL: 'Neutral',
};

export const GUARDIAN_CONSENSUS_LABEL_ZH: Record<GuardianNegotiationConsensus, string> = {
  ALIGNED: '三人共识一致',
  SPLIT: '存在分歧',
  BLOCKED: '暂无法共识',
};

export const GUARDIAN_CONSENSUS_LABEL_EN: Record<GuardianNegotiationConsensus, string> = {
  ALIGNED: 'Aligned consensus',
  SPLIT: 'Split views',
  BLOCKED: 'No consensus',
};

export function getGuardianStanceStyles(stance: GuardianNegotiationStance): string {
  switch (stance) {
    case 'SUPPORT':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'CAUTION':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'OPPOSE':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}
