/**
 * Agent 用户可见字段：英文枚举 / 技术码 → 中文（用户模式）
 * Debug 模式应传 preferZh=false，保留英文便于联调。
 */

/** failure_reason_codes：与后端 failure-reason-codes 文档对齐，未命中则回退原码 */
export const FAILURE_REASON_CODE_LABELS_ZH: Record<string, string> = {
  MISSING_DESTINATION: '缺少目的地',
  TIME_GAP: '缺少或无效日期',
  MISSING_DATES: '缺少出行日期',
  UNSUPPORTED_CONSTRAINT: '约束不支持',
  SECURITY_RISK: '安全风险',
  POLICY_VIOLATION: '政策或合规限制',
  DRIVE_SAFETY_VIOLATED: '驾驶安全校验未通过',
  PT_TRANSFER_GAP_VIOLATION: '公共交通换乘条件不满足',
  VERIFICATION_FAILED_UNSPECIFIED: '验证未通过（原因待细化）',
  INTENT_COMPILE_ERROR: '意图解析失败',
  SPEC_TYPE_ERROR: '规格类型错误',
  MISSING_CONSTRAINTS: '缺少必要约束信息',
  VERIFICATION_FAILED: '验证失败',
};

export const VERIFICATION_STATUS_LABELS_ZH: Record<string, string> = {
  VERIFIED: '已验证',
  FAILED: '验证未通过',
  PARTIALLY_VERIFIED: '部分验证',
  PARTIAL: '部分验证',
  STALE: '证据已过期',
  UNVERIFIED: '未验证',
};

/** 编排步骤（与 OrchestrationProgressCard 一致） */
export const ORCHESTRATION_STEP_LABELS_ZH: Record<string, string> = {
  INTAKE: '接收请求',
  STATE_UPDATE: '状态更新',
  RESEARCH: '调研',
  GATE_EVAL: '可行性评估',
  CONTEXT_BUILD: '构建上下文',
  PLAN_GEN: '生成行程',
  OPTIMIZE: '优化',
  VERIFY: '验证',
  COMPLIANCE: '合规检查',
  REPAIR: '修复',
  NARRATE: '生成说明',
  FEEDBACK: '反馈处理',
  DONE: '已完成',
  FAILED: '失败',
  TIMEOUT: '超时',
  HALLUCINATION_DETECTION: '幻觉检测',
};

export const SUB_AGENT_LABELS_ZH: Record<string, string> = {
  Orchestrator: '编排器',
  Planner: '规划',
  Gatekeeper: '安全守门',
  Compliance: '合规',
  LocalInsight: '本地洞察',
  CoreDecision: '决策核心',
  Narrator: '说明生成',
};

export const ROUTE_SELECTED_PATH_LABELS_ZH: Record<string, string> = {
  FAST: '快速路径',
  DEEP: '深度路径',
};

export function translateFailureReasonCodeForUser(code: string, preferZh: boolean): string {
  if (!preferZh || !code) return code;
  return FAILURE_REASON_CODE_LABELS_ZH[code] ?? code;
}

export function translateVerificationStatusForUser(status: string | undefined, preferZh: boolean): string {
  if (!status) return '';
  if (!preferZh) return status;
  const key = status.trim();
  if (VERIFICATION_STATUS_LABELS_ZH[key]) return VERIFICATION_STATUS_LABELS_ZH[key];
  const upper = key.toUpperCase();
  if (VERIFICATION_STATUS_LABELS_ZH[upper]) return VERIFICATION_STATUS_LABELS_ZH[upper];
  return status;
}

export function translateOrchestrationStepForUser(step: string | undefined, preferZh: boolean): string {
  if (!step) return '';
  if (!preferZh) return step;
  const direct = ORCHESTRATION_STEP_LABELS_ZH[step];
  if (direct) return direct;
  const upper = step.trim().toUpperCase();
  return ORCHESTRATION_STEP_LABELS_ZH[upper] ?? step;
}

export function translateSubAgentForUser(actor: string | undefined, preferZh: boolean): string {
  if (!actor) return '';
  if (!preferZh) return actor;
  return SUB_AGENT_LABELS_ZH[actor] ?? actor;
}

export function translateRouteSelectedPathForUser(path: string | undefined, preferZh: boolean): string {
  if (!path) return '';
  if (!preferZh) return path;
  const u = path.trim().toUpperCase();
  return ROUTE_SELECTED_PATH_LABELS_ZH[u] ?? path;
}

/** 证据卡角标：若为已知 verification 状态则翻译 */
export function translateEvidenceBadgeTextForUser(text: string | undefined, preferZh: boolean): string {
  if (!text || !preferZh) return text ?? '';
  const t = text.trim();
  if (VERIFICATION_STATUS_LABELS_ZH[t]) return VERIFICATION_STATUS_LABELS_ZH[t];
  const tv = t.toUpperCase();
  if (VERIFICATION_STATUS_LABELS_ZH[tv]) return VERIFICATION_STATUS_LABELS_ZH[tv];
  if (FAILURE_REASON_CODE_LABELS_ZH[t]) return FAILURE_REASON_CODE_LABELS_ZH[t];
  if (FAILURE_REASON_CODE_LABELS_ZH[tv]) return FAILURE_REASON_CODE_LABELS_ZH[tv];
  return text;
}
