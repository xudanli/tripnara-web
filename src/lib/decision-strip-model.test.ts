import { describe, expect, it } from 'vitest';
import {
  buildDecisionStripCompareSummary,
  pickGuardianDigestAlerts,
  resolveDecisionStripPersonaLine,
  resolveDecisionStripPresentation,
} from '@/lib/decision-strip-model';
import type { PersonaAlert } from '@/types/trip';
import type { OptionComparison } from '@/api/planning-workbench';

describe('buildDecisionStripCompareSummary', () => {
  it('maps recommendation and kernel divergence', () => {
    const comparison: OptionComparison = {
      options: [{ optionId: 'opt-a' }, { optionId: 'opt-b' }],
      recommendation: { optionId: 'opt-b', reason: '平衡成本与可执行性' },
      kernelGateEval: {
        divergesFromLlmRecommendation: true,
        llmRecommendedOptionId: 'opt-a',
        recommendedByGate: 'opt-b',
      },
    };

    expect(buildDecisionStripCompareSummary(comparison)).toEqual({
      recommendedOptionId: 'opt-b',
      reason: '平衡成本与可执行性',
      divergesFromLlm: true,
      llmRecommendedOptionId: 'opt-a',
      recommendedByGate: 'opt-b',
      optionCount: 2,
    });
  });
});

describe('resolveDecisionStripPresentation', () => {
  it('prioritizes compare recommendation headline', () => {
    const summary = buildDecisionStripCompareSummary({
      recommendation: { optionId: 'opt-b', reason: 'Kernel 推荐 opt-b' },
      options: [{ optionId: 'opt-a' }, { optionId: 'opt-b' }],
    });
    const out = resolveDecisionStripPresentation({
      guards: null,
      compareSummary: summary,
      personaLine: null,
    });
    expect(out.headline).toBe('Kernel 推荐 opt-b');
    expect(out.subline).toContain('opt-b');
    expect(out.state).toBe('conclusion');
  });
});

describe('pickGuardianDigestAlerts', () => {
  const alert = (
    id: string,
    persona: PersonaAlert['persona'],
    severity: PersonaAlert['severity'],
    message: string,
  ): PersonaAlert => ({
    id,
    persona,
    name: persona,
    title: `${persona} 提醒`,
    message,
    severity,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('returns at most one alert per persona, warning first', () => {
    const items = pickGuardianDigestAlerts([
      alert('1', 'NEPTUNE', 'info', '可换方案'),
      alert('2', 'ABU', 'warning', '安全风险'),
      alert('3', 'ABU', 'info', '次要安全提示'),
      alert('4', 'DR_DRE', 'warning', '节奏过紧'),
    ]);

    expect(items.map((i) => i.persona)).toEqual(['ABU', 'DR_DRE', 'NEPTUNE']);
    expect(items[0]?.body).toBe('安全风险');
  });

  it('returns empty when only success or internal alerts', () => {
    expect(
      pickGuardianDigestAlerts([
        alert('1', 'ABU', 'success', '一切正常'),
        {
          ...alert('2', 'DR_DRE', 'warning', 'ResearchPatch scope violation'),
          message: 'ResearchPatch scope violation in pipeline',
          metadata: { audience: 'internal' },
        },
      ]),
    ).toEqual([]);
  });

  it('maps BFF user-facing alerts with deepLink', () => {
    const items = pickGuardianDigestAlerts([
      {
        id: 'bff-1',
        persona: 'ABU',
        title: '当前方案被安全门控拦截',
        explanation: '第 3 天大风不宜自驾。',
        severity: 'warning',
        createdAt: '2026-01-01T00:00:00Z',
        metadata: {
          audience: 'user',
          reasonCodesDisplayZh: ['安全门控拒绝'],
          deepLink: { type: 'feasibility', issueId: 'issue-wind-d3' },
        },
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('当前方案被安全门控拦截');
    expect(items[0]?.body).toBe('第 3 天大风不宜自驾。');
    expect(items[0]?.reasonSummary).toBe('安全门控拒绝');
    expect(items[0]?.deepLink?.issueId).toBe('issue-wind-d3');
  });
});

describe('resolveDecisionStripPersonaLine', () => {
  it('uses single_lead presentation headline and body', () => {
    const result = resolveDecisionStripPersonaLine([
      {
        id: 'lead-1',
        persona: 'ABU',
        title: 'ignored marketing title',
        explanation: '第 3 天大风不宜自驾。',
        severity: 'warning',
        createdAt: '2026-01-01T00:00:00Z',
        presentation: {
          mode: 'single_lead',
          headline: '当前方案被安全门控拦截',
          narrative: '第 3 天大风不宜自驾。',
          leadSpeaker: 'ABU',
        },
        metadata: { audience: 'user' },
      },
      {
        id: 'secondary',
        persona: 'DR_DRE',
        title: '节奏提醒',
        explanation: '第 2 天偏紧',
        severity: 'info',
        createdAt: '2026-01-01T00:00:00Z',
        metadata: { audience: 'user' },
      },
    ]);

    expect(result.mode).toBe('single_lead');
    expect(result.leadHeadline).toBe('当前方案被安全门控拦截');
    expect(result.line?.personaLabel).toBe('Abu');
    expect(result.line?.text).toContain('大风不宜自驾');
  });
});
