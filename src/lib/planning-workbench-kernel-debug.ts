/** planState.metadata.kernelBridge / kernelCompareGateMismatch（运营 / 调试） */

export interface PlanStateKernelBridge {
  decisionOsAudit?: Record<string, unknown>;
  shadowDiff?: Record<string, unknown>;
}

export interface PlanStateKernelCompareGateMismatch {
  llmRecommended?: string;
  gateRecommended?: string;
}

export interface PlanStateKernelDebug {
  kernelBridge?: PlanStateKernelBridge;
  kernelCompareGateMismatch?: PlanStateKernelCompareGateMismatch;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 从 planState.metadata 提取 Kernel Bridge / 门控不一致审计 */
export function pickPlanStateKernelDebug(
  metadata: Record<string, unknown> | undefined | null,
): PlanStateKernelDebug | undefined {
  const meta = asRecord(metadata);
  if (!meta) return undefined;

  const bridgeRaw = asRecord(meta.kernelBridge ?? meta.kernel_bridge);
  const mismatchRaw = asRecord(
    meta.kernelCompareGateMismatch ?? meta.kernel_compare_gate_mismatch,
  );

  const kernelBridge: PlanStateKernelBridge | undefined = bridgeRaw
    ? {
        ...(bridgeRaw.decisionOsAudit ?? bridgeRaw.decision_os_audit
          ? {
              decisionOsAudit: (bridgeRaw.decisionOsAudit ??
                bridgeRaw.decision_os_audit) as Record<string, unknown>,
            }
          : {}),
        ...(bridgeRaw.shadowDiff ?? bridgeRaw.shadow_diff
          ? { shadowDiff: (bridgeRaw.shadowDiff ?? bridgeRaw.shadow_diff) as Record<string, unknown> }
          : {}),
      }
    : undefined;

  const kernelCompareGateMismatch: PlanStateKernelCompareGateMismatch | undefined = mismatchRaw
    ? {
        ...(typeof (mismatchRaw.llmRecommended ?? mismatchRaw.llm_recommended) === 'string'
          ? { llmRecommended: String(mismatchRaw.llmRecommended ?? mismatchRaw.llm_recommended) }
          : {}),
        ...(typeof (mismatchRaw.gateRecommended ?? mismatchRaw.gate_recommended) === 'string'
          ? {
              gateRecommended: String(mismatchRaw.gateRecommended ?? mismatchRaw.gate_recommended),
            }
          : {}),
      }
    : undefined;

  const hasBridge =
    kernelBridge &&
    (kernelBridge.decisionOsAudit != null || kernelBridge.shadowDiff != null);
  const hasMismatch =
    kernelCompareGateMismatch &&
    (kernelCompareGateMismatch.llmRecommended != null ||
      kernelCompareGateMismatch.gateRecommended != null);

  if (!hasBridge && !hasMismatch) return undefined;

  return {
    ...(hasBridge ? { kernelBridge } : {}),
    ...(hasMismatch ? { kernelCompareGateMismatch } : {}),
  };
}
