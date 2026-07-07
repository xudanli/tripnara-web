import { describe, expect, it } from 'vitest';
import { buildPersonaValidationDimensions, buildPersonaValidationDimensionsFromOption } from './persona-validation-dimensions.util';
import type { PersonaAlert } from '@/types/trip';

describe('buildPersonaValidationDimensions', () => {
  it('maps Abu / Dr.Dre / Neptune to 可行性 / 节奏 / 体验保留', () => {
    const alerts: PersonaAlert[] = [
      {
        id: '1',
        persona: 'ABU',
        title: '安全',
        severity: 'warning',
        explanation: '安全风险',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        persona: 'DR_DRE',
        title: '节奏',
        severity: 'info',
        explanation: '节奏偏紧',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const dimensions = buildPersonaValidationDimensions(alerts, 'A');

    expect(dimensions.map((d) => d.label)).toEqual(['可行性', '节奏', '体验保留']);
    expect(dimensions[0].stanceLabel).toBe('需关注');
    expect(dimensions[1].stanceLabel).toBe('建议调整');
    expect(dimensions[2].stanceLabel).toBe('可接受');
  });

  it('builds validation from option tradeoffs', () => {
    const dimensions = buildPersonaValidationDimensionsFromOption(
      {
        id: 'a',
        label: '方案 A',
        tradeoffs: [
          { dimension: 'SAFETY', direction: 'IMPROVE', explanation: '安全约束通过' },
          { dimension: 'FATIGUE', direction: 'WORSEN', explanation: '当天负荷偏高' },
          { dimension: 'POI_COVERAGE', direction: 'IMPROVE', explanation: '体验保留 92%' },
        ],
      },
      'A',
    );
    expect(dimensions[0].stanceLabel).toBe('可接受');
    expect(dimensions[1].stanceLabel).toBe('需关注');
    expect(dimensions[2].summary).toContain('92%');
  });

  it('prefers contextualNarrative on option tradeoffs', () => {
    const dimensions = buildPersonaValidationDimensionsFromOption(
      {
        id: 'a',
        label: '方案 A',
        tradeoffs: [
          {
            dimension: 'SAFETY',
            direction: 'WORSEN',
            explanation: '雷尼斯黑沙滩：官方规则已超过 14 天未核验',
            contextualNarrative:
              '你们 Day 2 下午计划去雷尼斯黑沙滩，但官方潮汐/禁入规则已 14 天未更新。建议出发前再确认。',
          },
        ],
      },
      'A',
    );
    expect(dimensions[0].summary).toContain('Day 2 下午');
    expect(dimensions[0].summary).not.toContain('14 天未核验');
  });

  it('uses metadata.tradeoffDimensions per persona dimension', () => {
    const alerts: PersonaAlert[] = [
      {
        id: '1',
        persona: 'ABU',
        title: '安全',
        severity: 'warning',
        explanation: '短摘要',
        createdAt: '2026-01-01T00:00:00Z',
        metadata: {
          tradeoffDimensions: [
            {
              dimension: 'SAFETY',
              direction: 'WORSEN',
              explanation: '规则未核验',
              contextualNarrative: 'Day 2 黑沙滩规则已 14 天未更新。',
            },
          ],
        },
      },
    ];

    const dimensions = buildPersonaValidationDimensions(alerts, 'A');
    expect(dimensions[0].summary).toBe('Day 2 黑沙滩规则已 14 天未更新。');
    expect(dimensions[0].stanceLabel).toBe('需关注');
  });
});
