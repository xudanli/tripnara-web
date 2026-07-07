import type { RouteAndRunResponse } from '@/api/agent';
import type { OptionComparison } from '@/api/planning-workbench';
import { normalizeSuggestedOperations } from '@/lib/suggested-operations';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** 轻量解析（避免测试/条带层拉取整个 planning-workbench API 模块） */
function parseOptionComparison(raw: unknown): OptionComparison | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const rec = asRecord(o.recommendation);
  const optionId = rec?.optionId ?? rec?.option_id;
  const reason = rec?.reason;
  if (typeof optionId !== 'string') return undefined;

  const optionsRaw = o.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw
        .map((item) => {
          const entry = asRecord(item);
          const id = entry?.optionId ?? entry?.option_id;
          if (typeof id !== 'string') return null;
          const tradeoffsRaw = entry?.tradeoffs;
          const tradeoffs = Array.isArray(tradeoffsRaw)
            ? tradeoffsRaw
                .map((t) => (typeof t === 'string' ? t.trim() : ''))
                .filter(Boolean)
            : undefined;
          return {
            optionId: id,
            ...(tradeoffs?.length ? { tradeoffs } : {}),
          };
        })
        .filter((x): x is { optionId: string } => x != null)
    : undefined;

  const gateRaw = asRecord(o.kernelGateEval ?? o.kernel_gate_eval);
  const kernelGateEval =
    gateRaw &&
    (typeof gateRaw.divergesFromLlmRecommendation === 'boolean' ||
      typeof gateRaw.diverges_from_llm_recommendation === 'boolean')
      ? {
          divergesFromLlmRecommendation: Boolean(
            gateRaw.divergesFromLlmRecommendation ?? gateRaw.diverges_from_llm_recommendation,
          ),
          ...(typeof (gateRaw.llmRecommendedOptionId ?? gateRaw.llm_recommended_option_id) ===
          'string'
            ? {
                llmRecommendedOptionId: String(
                  gateRaw.llmRecommendedOptionId ?? gateRaw.llm_recommended_option_id,
                ),
              }
            : {}),
          ...(typeof (gateRaw.recommendedByGate ?? gateRaw.recommended_by_gate) === 'string'
            ? {
                recommendedByGate: String(
                  gateRaw.recommendedByGate ?? gateRaw.recommended_by_gate,
                ),
              }
            : {}),
        }
      : undefined;

  return {
    ...(options?.length ? { options } : {}),
    recommendation: {
      optionId,
      reason: typeof reason === 'string' ? reason : `推荐方案 ${optionId}`,
    },
    ...(kernelGateEval ? { kernelGateEval } : {}),
  };
}

function pickComparisonFromRecord(record: Record<string, unknown> | null): OptionComparison | undefined {
  if (!record) return undefined;

  const direct = parseOptionComparison(record.comparison);
  if (direct?.recommendation) return direct;

  for (const key of ['uiOutput', 'ui_output', 'workbench_ui_output', 'workbenchUiOutput']) {
    const ui = asRecord(record[key]);
    if (!ui) continue;
    const cmp = parseOptionComparison(ui.comparison);
    if (cmp?.recommendation) return cmp;
  }

  const metadata = asRecord(record.metadata);
  if (metadata) {
    const cmp = parseOptionComparison(metadata.comparison);
    if (cmp?.recommendation) return cmp;
  }

  return undefined;
}

/** 从 route_and_run 响应中提取 workbench compare 读模型（若存在） */
export function pickComparisonFromRouteRun(
  response: RouteAndRunResponse | null | undefined,
): OptionComparison | undefined {
  if (!response) return undefined;

  const payload = asRecord(response.result?.payload);
  const explain = asRecord(response.explain as unknown);
  const orchestration = payload ? asRecord(payload.orchestrationResult ?? payload.orchestration_result) : null;

  for (const source of [payload, explain, orchestration]) {
    const cmp = pickComparisonFromRecord(source);
    if (cmp) return cmp;
  }

  return undefined;
}

/** 解析「一键优化」类 suggested_operation，供 Strip 主 CTA 使用 */
export function pickOptimizeSuggestedOperation(
  response: RouteAndRunResponse | null | undefined,
): { label: string; message: string } | null {
  const payload = asRecord(response?.result?.payload);
  if (!payload) return null;

  const ops = normalizeSuggestedOperations(
    payload.suggested_operations ?? payload.suggestedOperations,
  );
  if (!ops?.length) return null;

  const match = ops.find((op) => {
    if (op.kind !== 'route_and_run_message') return false;
    const id = op.id.toLowerCase();
    return (
      id.includes('optim') ||
      op.label.includes('优化') ||
      op.label.toLowerCase().includes('optim')
    );
  });
  if (!match) return null;

  const message =
    (typeof match.payload?.message === 'string' && match.payload.message.trim()) ||
    '请帮我优化当前行程方案';

  return { label: match.label, message };
}
