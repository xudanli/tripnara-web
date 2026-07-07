import { describe, expect, it } from 'vitest';
import {
  formatExplorationIssuesSummary,
  getComparePageHeadline,
  getExplorationCheckStatusHeadline,
  getExplorationIssueSourceKind,
  getGenerationSourceBadge,
  getOntologyIssueUserHint,
  isCprePoiConsumerIssue,
  isOntologyConsumerIssue,
  isExplorationRevalidationPassed,
  resolveExplorationCheckUiState,
  shouldRegenerateCandidates,
  shouldShowComparePage,
  shouldUseGatewayRepairFlow,
} from './helpers';
import type { ConsumerIssueView } from './types';

const baseIssue: ConsumerIssueView = {
  issueId: 'gateway-problem-1',
  severity: 'BLOCK',
  headline: 'test',
  source: {
    gatewayAssessmentBatchId: 'b1',
    canonicalIssueId: 'c1',
    tripId: 't1',
    tripVersion: 1,
  },
};

describe('exploration api helpers', () => {
  it('maps generation mode to PM-approved headlines', () => {
    expect(getComparePageHeadline('PERSONALIZED')).toBe(
      '三种典型走法对比 · 已按你的条件个性化',
    );
    expect(getComparePageHeadline('ENGINE')).toBe('三种走法对比 · 引擎已计算驾驶路线');
    expect(getComparePageHeadline('STATIC')).toBe('比较三种路线的真实差异');
  });

  it('maps generation source badges', () => {
    expect(getGenerationSourceBadge('PERSONALIZED')?.label).toBe('已个性化');
    expect(getGenerationSourceBadge('ENGINE_MAPBOX')?.label).toBe('引擎计算');
    expect(getGenerationSourceBadge('LLM')?.label).toBe('AI 生成');
    expect(getGenerationSourceBadge('STATIC_CATALOG')).toBeNull();
  });

  it('evaluates candidates lifecycle flags', () => {
    expect(shouldRegenerateCandidates('STALE')).toBe(true);
    expect(shouldRegenerateCandidates('READY')).toBe(false);
    expect(shouldShowComparePage('READY')).toBe(true);
    expect(shouldShowComparePage('EMPTY')).toBe(false);
  });

  it('classifies ontology, poi, and gateway issues', () => {
    expect(isOntologyConsumerIssue({ issueId: 'ontology:VEHICLE_CAPABILITY_MISMATCH' })).toBe(true);
    expect(isCprePoiConsumerIssue({ issueId: 'cpre-poi-secret-canyon' })).toBe(true);
    expect(getExplorationIssueSourceKind(baseIssue)).toBe('gateway');
  });

  it('formats issues summary with blocker and ontology counts', () => {
    expect(
      formatExplorationIssuesSummary({
        displayedIssues: [baseIssue],
        totalIssueCount: 3,
        blockerIssueCount: 2,
        ontologyIssueCount: 1,
      }),
    ).toBe('共 3 项 · 2 项阻断 · 1 项本体约束');
  });

  it('maps ontology issue hints and check UI state', () => {
    expect(getOntologyIssueUserHint('ontology:VEHICLE_CAPABILITY_MISMATCH')).toContain('车辆');
    expect(shouldUseGatewayRepairFlow(baseIssue)).toBe(true);
    expect(
      shouldUseGatewayRepairFlow({
        issueId: 'ontology:VEHICLE_CAPABILITY_MISMATCH',
        severity: 'BLOCK',
      }),
    ).toBe(false);

    const clear = resolveExplorationCheckUiState({ blockerIssueCount: 0 }, null);
    expect(clear.status).toBe('clear');
    expect(getExplorationCheckStatusHeadline(clear)).toContain('未发现阻断');

    const ontologyOnly = resolveExplorationCheckUiState(
      { blockerIssueCount: 1, ontologyIssueCount: 1, gatewayOpenCount: 0 },
      null,
    );
    expect(ontologyOnly.status).toBe('ontology_adjust');

    expect(
      isExplorationRevalidationPassed('FAILED', {
        displayedIssues: [],
        totalIssueCount: 2,
        blockerIssueCount: 1,
      }),
    ).toBe(false);
    expect(
      isExplorationRevalidationPassed('PASSED', {
        displayedIssues: [],
        totalIssueCount: 2,
        blockerIssueCount: 0,
      }),
    ).toBe(true);
  });
});
