/**
 * 决策草案 Mock 数据
 * 用于前端开发和测试
 */

import type {
  DecisionDraft,
  DecisionStep,
  EvidenceRef,
  DecisionLogEntry,
  DecisionDraftMetadata,
  TocExplanation,
  ExpertExplanation,
  ImpactPreviewResult,
  DecisionReplay,
  DecisionDraftVersion,
} from '@/types/decision-draft';
import { normalizeGateStatus } from '@/lib/gate-status';

/**
 * 生成 Mock 证据引用
 */
function createMockEvidence(index: number): EvidenceRef {
  return {
    evidence_id: `evidence-${index}`,
    source_title: `证据来源 ${index}`,
    source_url: `https://example.com/evidence/${index}`,
    publisher: `发布者 ${index}`,
    published_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    retrieved_at: new Date().toISOString(),
    data_timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: `这是证据 ${index} 的摘要内容，用于支持决策。`,
    relevance: 0.7 + Math.random() * 0.3,
    confidence: 0.8 + Math.random() * 0.2,
    related_decision_ids: [`step-${index}`],
  };
}

/**
 * 生成 Mock 决策步骤
 */
function createMockDecisionStep(index: number, type: string): DecisionStep {
  const statuses: Array<'pending' | 'approved' | 'rejected' | 'modified'> = [
    'approved',
    'pending',
    'approved',
    'approved',
  ];
  const status = statuses[index % statuses.length];
  const gateStatus = normalizeGateStatus(status);

  return {
    id: `step-${index}`,
    title: `决策步骤 ${index + 1}`,
    description: `这是决策步骤 ${index + 1} 的详细描述，说明了决策的原因和依据。`,
    type: type as any,
    status: status,
    confidence: 0.7 + Math.random() * 0.3,
    is_key: index < 5, // 前5个是关键决策
    inputs: [
      {
        name: 'input1',
        value: `输入值 ${index}`,
        source: 'previous_step',
        confidence: 0.8,
      },
    ],
    outputs: [
      {
        name: 'output1',
        value: `输出值 ${index}`,
        type: 'string',
        confidence: 0.85,
      },
    ],
    evidence: [createMockEvidence(index), createMockEvidence(index + 10)],
    decision_log: [
      {
        timestamp: new Date().toISOString(),
        agent: 'Planner',
        action: 'decision_made',
        reasoning: `决策步骤 ${index + 1} 的推理过程`,
        confidence: 0.8,
      },
    ],
    step_draft_ids: [`step-draft-${index}`],
    created_at: new Date(Date.now() - (10 - index) * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 生成 Mock 决策草案
 */
export function createMockDecisionDraft(draftId: string, planId: string): DecisionDraft {
  const decisionTypes = [
    'transport-decision',
    'accommodation-decision',
    'poi-selection',
    'budget-decision',
    'safety-decision',
    'pace-decision',
    'timing-decision',
  ];

  const steps: DecisionStep[] = Array.from({ length: 7 }, (_, i) =>
    createMockDecisionStep(i, decisionTypes[i % decisionTypes.length])
  );

  return {
    draft_id: draftId,
    plan_id: planId,
    plan_version: 1,
    decision_steps: steps,
    user_mode: 'toc',
    metadata: {
      decision_count: steps.length,
      step_count: steps.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * 生成 Mock 决策解释（ToC模式）
 */
export function createMockTocExplanation(draftId: string): TocExplanation {
  return {
    title: '决策解释',
    summary: '系统基于您的需求和约束条件，生成了以下关键决策。每个决策都经过三人格评估，确保安全、节奏和结构的平衡。',
    conclusion: '建议采用租车方式，选择中档住宿，重点游览冰川和温泉景点。',
    confidence: 0.85,
    status: 'ALLOW',
    key_decisions: [
      {
        id: 'step-0',
        title: '是否需要租车',
        conclusion: '建议租车',
        confidence: 0.87,
        reasoning: '因为您的行程涉及多个偏远景点，公共交通不便。',
      },
      {
        id: 'step-1',
        title: '住宿档位选择',
        conclusion: '中档住宿',
        confidence: 0.82,
        reasoning: '基于您的预算和舒适度需求，中档住宿是最佳选择。',
      },
    ],
    evidence_summary: '共参考了 14 条证据，包括交通时刻表、住宿价格、景点开放时间等。',
  };
}

/**
 * 生成 Mock 决策解释（Expert模式）
 */
export function createMockExpertExplanation(draftId: string, stepId?: string): ExpertExplanation {
  const draft = createMockDecisionDraft(draftId, 'plan-123');
  return {
    title: stepId ? `决策步骤 ${stepId} 的解释` : '决策解释',
    summary: '完整的决策过程解释，包含所有决策步骤、证据链和决策日志。',
    conclusion: '系统经过多步骤推理，最终生成可执行的行程方案。',
    confidence: 0.85,
    status: 'ALLOW',
    decision_steps: draft.decision_steps,
    step_drafts: [],
    evidence_chain: draft.decision_steps.flatMap((step) => step.evidence),
    decision_log: draft.decision_steps.flatMap((step) => step.decision_log),
  };
}

/**
 * 生成 Mock 影响预览结果
 */
export function createMockImpactPreview(stepId: string): ImpactPreviewResult {
  return {
    affected_steps: ['step-1', 'step-2', 'step-3'],
    affected_evidence: ['evidence-1', 'evidence-2'],
    impact_summary: '修改此决策会影响 3 个其他决策步骤，包括行程节奏和成本结构。',
    confidence_change: -0.15,
  };
}

/**
 * 生成 Mock 决策回放
 */
export function createMockReplay(draftId: string): DecisionReplay {
  const draft = createMockDecisionDraft(draftId, 'plan-123');
  return {
    timeline: draft.decision_steps.map((step, index) => ({
      timestamp: step.created_at,
      step: 'PLAN_GEN' as const,
      decision_step: step,
      decision_made: step.decision_log[0],
    })),
    duration_ms: 15300,
  };
}

/**
 * 生成 Mock 版本列表
 */
export function createMockVersions(draftId: string): DecisionDraftVersion[] {
  const baseDraft = createMockDecisionDraft(draftId, 'plan-123');
  return [
    {
      version_id: 'version-1',
      draft_id: draftId,
      version_number: 1,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'user-123',
      description: '初始版本',
      decision_steps: baseDraft.decision_steps,
    },
    {
      version_id: 'version-2',
      draft_id: draftId,
      version_number: 2,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'user-123',
      description: '修改了交通决策',
      decision_steps: baseDraft.decision_steps.map((step, i) =>
        i === 0 ? { ...step, status: 'modified' } : step
      ),
    },
    {
      version_id: 'version-3',
      draft_id: draftId,
      version_number: 3,
      created_at: new Date().toISOString(),
      created_by: 'user-123',
      description: '当前版本',
      decision_steps: baseDraft.decision_steps,
    },
  ];
}
