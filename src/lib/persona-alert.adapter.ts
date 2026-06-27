import type {
  GuardianAction,
  GuardianActionSlot,
  GuardianExpressionPhase,
  GuardianSupportingLine,
  LeadSpeakerPersona,
  LeadSpeakerScenario,
  PersonaDisplayStyle,
} from '@/types/guardian-presentation';
import type {
  GetPersonaAlertsParams,
  PersonaAlert,
  PersonaAlertDeepLink,
  PersonaAlertDeepLinkType,
  PersonaAlertMetadata,
  PersonaAlertPresentationSnapshot,
} from '@/types/trip';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function normalizeDeepLink(raw: unknown): PersonaAlertDeepLink | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const type = asString(r.type) as PersonaAlertDeepLinkType | undefined;
  if (!type) return undefined;
  return {
    type,
    issueId: asString(r.issueId ?? r.issue_id),
    dayIndex: typeof r.dayIndex === 'number' ? r.dayIndex : typeof r.day_index === 'number' ? r.day_index : undefined,
    decisionLogId: asString(r.decisionLogId ?? r.decision_log_id),
  };
}

function normalizeSupportingLine(raw: unknown): GuardianSupportingLine | null {
  const r = asRecord(raw);
  if (!r) return null;
  const persona = asString(r.persona) as LeadSpeakerPersona | undefined;
  const text = asString(r.text);
  if (!persona || !text) return null;
  const role = asString(r.role) as GuardianSupportingLine['role'] | undefined;
  return {
    persona,
    icon: asString(r.icon) ?? '',
    name: asString(r.name) ?? persona,
    role: role ?? 'evidence',
    text,
  };
}

export function normalizePersonaAlertPresentation(
  raw: unknown,
): PersonaAlertPresentationSnapshot | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const headline = asString(r.headline);
  const narrative = asString(r.narrative);
  const briefLines = asStringArray(r.briefLines ?? r.brief_lines);
  const supportingRaw = r.supportingLines ?? r.supporting_lines;
  const supportingLines = Array.isArray(supportingRaw)
    ? supportingRaw.map(normalizeSupportingLine).filter((x): x is GuardianSupportingLine => x != null)
    : undefined;

  if (!headline && !narrative && !briefLines?.length && !supportingLines?.length) {
    return undefined;
  }

  return {
    headline,
    narrative,
    briefLines,
    supportingLines,
    leadSpeaker: asString(r.leadSpeaker ?? r.lead_speaker) as LeadSpeakerPersona | undefined,
    scenario: asString(r.scenario) as LeadSpeakerScenario | undefined,
    displayStyle: asString(r.displayStyle ?? r.display_style) as PersonaDisplayStyle | undefined,
    expressionPhase: asString(r.expressionPhase ?? r.expression_phase) as GuardianExpressionPhase | undefined,
    actions: asRecord(r.actions) as Partial<Record<GuardianActionSlot, GuardianAction>> | undefined,
    hardConstraintBlocked:
      r.hardConstraintBlocked === true || r.hard_constraint_blocked === true ? true : undefined,
    structuredStatus: asRecord(r.structuredStatus ?? r.structured_status) as
      | PersonaAlertPresentationSnapshot['structuredStatus']
      | undefined,
    mode: asString(r.mode) as PersonaAlertPresentationSnapshot['mode'] | undefined,
  };
}

export function normalizePersonaAlertMetadata(raw: unknown): PersonaAlertMetadata | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  return {
    audience: asString(r.audience) as PersonaAlertMetadata['audience'],
    scenario: asString(r.scenario) as LeadSpeakerScenario | undefined,
    action: asString(r.action) as PersonaAlertMetadata['action'],
    decisionSource: asString(r.decisionSource ?? r.decision_source) as PersonaAlertMetadata['decisionSource'],
    reasonCodes: asStringArray(r.reasonCodes ?? r.reason_codes),
    reasonCodesDisplayZh: asStringArray(r.reasonCodesDisplayZh ?? r.reason_codes_display_zh),
    readinessEvidenceDisplayZh: asString(
      r.readinessEvidenceDisplayZh ?? r.readiness_evidence_display_zh,
    ),
    deepLink: normalizeDeepLink(r.deepLink ?? r.deep_link),
  };
}

/** BFF M1+ persona alert 归一化（GET persona-alerts / loop ui.personaAlerts 同源） */
export function normalizePersonaAlert(raw: unknown): PersonaAlert | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  const persona = asString(r.persona) as PersonaAlert['persona'] | undefined;
  const title = asString(r.title);
  const severity = asString(r.severity) as PersonaAlert['severity'] | undefined;
  const createdAt = asString(r.createdAt ?? r.created_at);
  if (!id || !persona || !title || !severity || !createdAt) return null;

  return {
    id,
    persona,
    name: asString(r.name),
    title,
    explanation: asString(r.explanation),
    message: asString(r.message),
    severity,
    createdAt,
    presentation: normalizePersonaAlertPresentation(r.presentation),
    metadata: normalizePersonaAlertMetadata(r.metadata),
  };
}

export function normalizePersonaAlerts(raw: unknown): PersonaAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePersonaAlert).filter((x): x is PersonaAlert => x != null);
}

export function buildGetPersonaAlertsParams(
  params?: GetPersonaAlertsParams,
): GetPersonaAlertsParams {
  return {
    audience: 'user',
    limit: 20,
    ...params,
  };
}
