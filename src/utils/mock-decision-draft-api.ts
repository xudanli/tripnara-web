/**
 * 决策草案API Mock拦截器
 * 用于开发环境测试，无需后端支持
 */

import type {
  DecisionDraft,
  DecisionExplanation,
  ImpactPreviewResult,
  DecisionReplay,
  DecisionDraftVersion,
  UpdateDecisionStepRequest,
  PreviewImpactRequest,
  UserMode,
} from '@/types/decision-draft';
import {
  createMockDecisionDraft,
  createMockTocExplanation,
  createMockExpertExplanation,
  createMockImpactPreview,
  createMockReplay,
  createMockVersions,
} from '@/mocks/decision-draft';

/**
 * Mock API响应延迟（模拟网络延迟）
 */
const MOCK_DELAY = 500; // 500ms

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock决策草案API
 * 在开发环境中使用，拦截真实API调用
 */
export const mockDecisionDraftApi = {
  /**
   * 获取决策草案
   */
  getDecisionDraft: async (draftId: string, userMode: UserMode = 'toc'): Promise<DecisionDraft> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getDecisionDraft:', { draftId, userMode });
    const draft = createMockDecisionDraft(draftId, `plan-${draftId}`);
    return { ...draft, user_mode: userMode };
  },

  /**
   * 获取决策解释（草案级别）
   */
  getExplanation: async (
    draftId: string,
    userMode: UserMode = 'toc',
    stepId?: string
  ): Promise<DecisionExplanation> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getExplanation:', { draftId, userMode, stepId });
    
    if (userMode === 'toc') {
      return createMockTocExplanation(draftId);
    } else {
      return createMockExpertExplanation(draftId, stepId);
    }
  },

  /**
   * 获取步骤解释
   */
  getStepExplanation: async (draftId: string, stepId: string): Promise<DecisionExplanation> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getStepExplanation:', { draftId, stepId });
    return createMockExpertExplanation(draftId, stepId);
  },

  /**
   * 更新决策步骤
   */
  updateStep: async (
    draftId: string,
    stepId: string,
    updates: UpdateDecisionStepRequest
  ): Promise<import('@/types/decision-draft').DecisionStep> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] updateStep:', { draftId, stepId, updates });
    
    const draft = createMockDecisionDraft(draftId, `plan-${draftId}`);
    const step = draft.decision_steps.find((s) => s.id === stepId);
    
    if (!step) {
      throw new Error(`步骤 ${stepId} 不存在`);
    }

    // 模拟更新
    const updatedStep = {
      ...step,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return updatedStep;
  },

  /**
   * 预览影响
   */
  previewImpact: async (
    draftId: string,
    request: PreviewImpactRequest
  ): Promise<ImpactPreviewResult> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] previewImpact:', { draftId, request });
    return createMockImpactPreview(request.step_id);
  },

  /**
   * 获取决策回放
   */
  getReplay: async (draftId: string): Promise<DecisionReplay> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getReplay:', { draftId });
    return createMockReplay(draftId);
  },

  /**
   * 获取版本列表
   */
  getVersions: async (draftId: string): Promise<DecisionDraftVersion[]> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getVersions:', { draftId });
    return createMockVersions(draftId);
  },

  /**
   * 获取版本详情
   */
  getVersionDetail: async (draftId: string, versionId: string): Promise<DecisionDraftVersion> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] getVersionDetail:', { draftId, versionId });
    const versions = createMockVersions(draftId);
    const version = versions.find((v) => v.version_id === versionId);
    if (!version) {
      throw new Error(`版本 ${versionId} 不存在`);
    }
    return version;
  },

  /**
   * 版本对比
   */
  compareVersions: async (
    draftId: string,
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: DecisionDraftVersion;
    version2: DecisionDraftVersion;
    diff: import('@/types/decision-draft').VersionDiff;
  }> => {
    await delay(MOCK_DELAY);
    console.log('[Mock API] compareVersions:', { draftId, versionId1, versionId2 });
    
    const versions = createMockVersions(draftId);
    const v1 = versions.find((v) => v.version_id === versionId1);
    const v2 = versions.find((v) => v.version_id === versionId2);
    
    if (!v1 || !v2) {
      throw new Error('版本不存在');
    }

    // 简化的diff计算
    const diff: import('@/types/decision-draft').VersionDiff = {
      decision_steps_added: [],
      decision_steps_removed: [],
      decision_steps_modified: v2.decision_steps.filter((step, i) => {
        const v1Step = v1.decision_steps[i];
        return v1Step && step.status !== v1Step.status;
      }),
    };

    return { version1: v1, version2: v2, diff };
  },
};

/**
 * 启用Mock API（开发环境）
 * 在开发环境中，可以临时替换真实API
 */
export function enableMockDecisionDraftApi() {
  if (import.meta.env.DEV) {
    console.log('[Mock API] 已启用决策草案Mock API');
    // 这里可以替换真实的API实现
    // 注意：实际项目中可能需要使用MSW或其他Mock工具
  }
}
