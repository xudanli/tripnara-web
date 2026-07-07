import type {
  DecisionProblemNegotiationClientNavigation,
  DecisionProblemNegotiationClosedOutcome,
  DecisionProblemNegotiationDetailFields,
  DecisionProblemNegotiationPrefill,
  DecisionProblemNegotiationPreflightResponse,
  DecisionProblemNegotiationProjection,
  StartDecisionProblemNegotiationResponse,
} from '@/types/decision-problem-negotiation';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function asNullableString(raw: unknown): string | null | undefined {
  if (raw == null) return raw as null | undefined;
  return typeof raw === 'string' ? (raw.trim() ? raw.trim() : null) : undefined;
}

function normalizeClosedOutcome(raw: unknown): DecisionProblemNegotiationClosedOutcome | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const recommendedOptionId = asString(
    record.recommendedOptionId ?? record.recommended_option_id,
  );
  const summaryCN = asString(record.summaryCN ?? record.summary_cn ?? record.summary);
  const closedAt = asString(record.closedAt ?? record.closed_at);
  const utteranceCount =
    typeof record.utteranceCount === 'number'
      ? record.utteranceCount
      : typeof record.utterance_count === 'number'
        ? record.utterance_count
        : undefined;
  if (!recommendedOptionId && !summaryCN && !closedAt && utteranceCount == null) {
    return undefined;
  }
  return {
    recommendedOptionId,
    summaryCN,
    utteranceCount,
    closedAt,
  };
}

function normalizeNegotiationProjection(raw: unknown): DecisionProblemNegotiationProjection | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const buttonLabelRaw =
    record.buttonLabel !== undefined ? record.buttonLabel : record.button_label;
  const buttonLabel =
    buttonLabelRaw === '发起协商' || buttonLabelRaw === '进入协商'
      ? buttonLabelRaw
      : buttonLabelRaw === null
        ? null
        : undefined;
  const status = asString(record.status) as DecisionProblemNegotiationProjection['status'];
  const taskId = asString(record.taskId ?? record.task_id);
  const roundId = asNullableString(record.roundId ?? record.round_id);
  const closedOutcome = normalizeClosedOutcome(record.closedOutcome ?? record.closed_outcome);
  const visible =
    record.visible === false || record.visible === 'false'
      ? false
      : record.visible === true || record.visible === 'true'
        ? true
        : undefined;

  if (
    !taskId &&
    roundId == null &&
    !status &&
    buttonLabel === undefined &&
    !closedOutcome &&
    visible === undefined
  ) {
    return undefined;
  }

  return {
    taskId,
    roundId: roundId ?? undefined,
    status,
    buttonLabel,
    closedOutcome,
    visible,
  };
}

/** 从 GET decision-problems/:id 原始 data 提取协商投影（Unified 顶层 + Legacy data 内） */
export function extractDecisionProblemNegotiationDetailFields(
  raw: unknown,
): DecisionProblemNegotiationDetailFields {
  const envelope = asRecord(raw);
  if (!envelope) return {};

  const fromEnvelope: DecisionProblemNegotiationDetailFields = {
    suggestedNegotiationDomain: asString(
      envelope.suggestedNegotiationDomain ?? envelope.suggested_negotiation_domain,
    ),
    suggestedDecisionNode: asString(
      envelope.suggestedDecisionNode ?? envelope.suggested_decision_node,
    ),
    negotiation: normalizeNegotiationProjection(envelope.negotiation),
  };

  const innerData = asRecord(envelope.data);
  if (!innerData) {
    return fromEnvelope;
  }

  const fromInner: DecisionProblemNegotiationDetailFields = {
    suggestedNegotiationDomain: asString(
      innerData.suggestedNegotiationDomain ?? innerData.suggested_negotiation_domain,
    ),
    suggestedDecisionNode: asString(
      innerData.suggestedDecisionNode ?? innerData.suggested_decision_node,
    ),
    negotiation: normalizeNegotiationProjection(innerData.negotiation),
  };

  return {
    suggestedNegotiationDomain:
      fromEnvelope.suggestedNegotiationDomain ?? fromInner.suggestedNegotiationDomain,
    suggestedDecisionNode:
      fromEnvelope.suggestedDecisionNode ?? fromInner.suggestedDecisionNode,
    negotiation: fromEnvelope.negotiation ?? fromInner.negotiation,
  };
}

function normalizePrefill(raw: unknown): DecisionProblemNegotiationPrefill | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const optionsRaw = record.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw
        .map((item, index) => {
          const row = asRecord(item);
          if (!row) return null;
          const id = asString(row.id) ?? `opt-${index + 1}`;
          const label = asString(row.label) ?? asString(row.title);
          if (!label) return null;
          return { id, label };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  return {
    title: asString(record.title),
    question: asString(record.question),
    options: options?.length ? options : undefined,
  };
}

function normalizeClientNavigation(raw: unknown): DecisionProblemNegotiationClientNavigation {
  const record = asRecord(raw);
  const roundId = asString(record?.roundId ?? record?.round_id) ?? null;
  const roundDomain = asString(record?.roundDomain ?? record?.round_domain) ?? null;
  return { roundId, roundDomain };
}

export function normalizeStartDecisionProblemNegotiationResponse(
  raw: unknown,
): StartDecisionProblemNegotiationResponse {
  const record = asRecord(raw) ?? {};
  const actionRaw = asString(record.action);
  const action =
    actionRaw === 'enter_existing' || actionRaw === 'claim_required' ? actionRaw : 'created';
  const clientNavigation = normalizeClientNavigation(record.clientNavigation ?? record.client_navigation);
  const claimRecord = asRecord(record.claimRequired ?? record.claim_required);

  return {
    action,
    negotiationTaskId: asString(record.negotiationTaskId ?? record.negotiation_task_id),
    roundId: asString(record.roundId ?? record.round_id) ?? clientNavigation.roundId,
    roundDomain: asString(record.roundDomain ?? record.round_domain) ?? clientNavigation.roundDomain,
    status: asString(record.status),
    clientNavigation,
    prefill: normalizePrefill(record.prefill),
    claimRequired: claimRecord
      ? {
          domain: asString(claimRecord.domain) ?? '',
          domainLabel: asString(claimRecord.domainLabel ?? claimRecord.domain_label),
        }
      : undefined,
  };
}

export function normalizeDecisionProblemNegotiationPreflightResponse(
  raw: unknown,
): DecisionProblemNegotiationPreflightResponse {
  const record = asRecord(raw) ?? {};
  return {
    canStart: record.canStart === true || record.can_start === true,
    blockReason: asString(record.blockReason ?? record.block_reason),
    blockMessageCN: asString(record.blockMessageCN ?? record.block_message_cn ?? record.blockMessage),
    suggestedDomain: asString(record.suggestedDomain ?? record.suggested_domain),
    suggestedDecisionNode: asString(record.suggestedDecisionNode ?? record.suggested_decision_node),
    requiresDomainClaim:
      record.requiresDomainClaim === true || record.requires_domain_claim === true,
    existingRoundId: asString(record.existingRoundId ?? record.existing_round_id) ?? null,
    existingTaskStatus: asString(record.existingTaskStatus ?? record.existing_task_status) ?? null,
    crossLevel: asString(record.crossLevel ?? record.cross_level),
  };
}
