import { describe, expect, it } from 'vitest';
import {
  counterIcon,
  formatCtreHeadline,
  getCtreCounterRows,
  getCtrePhaseLabel,
  normalizeCtreCompileProgress,
} from './helpers';
import type { CtreCompileProgressView } from './types';

const sampleProgress: CtreCompileProgressView = {
  schemaId: 'tripnara.ctre_compile_progress@v0',
  engine: 'CTRE',
  compileId: 'cde17fa1-0199-4963-b637-21f5172a7a98',
  status: 'partial',
  score: 88,
  trigger: 'plan_gen',
  phases: [
    {
      phase: 'CANONICALIZATION',
      status: 'done',
      counters: { POI: { done: 2, total: 2 } },
    },
  ],
  counters: {
    POI: { done: 2, total: 2 },
    Route: { done: 1, total: 1 },
  },
  updatedAt: '2026-08-01T12:00:01.000Z',
};

describe('ctre helpers', () => {
  it('maps phase labels to Chinese', () => {
    expect(getCtrePhaseLabel('CANONICALIZATION')).toBe('POI 标准化');
    expect(getCtrePhaseLabel('ROUTE_RESOLUTION')).toBe('路线解析');
  });

  it('filters counter rows with total > 0', () => {
    const rows = getCtreCounterRows(sampleProgress.counters);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ key: 'POI', label: '兴趣点', done: 2, total: 2 });
  });

  it('formats headline like backend SSE message', () => {
    expect(formatCtreHeadline(sampleProgress)).toBe(
      'CTRE 编译：partial score=88（兴趣点 2/2 · 路线 1/1）',
    );
  });

  it('computes counter icon states', () => {
    expect(counterIcon(2, 2)).toBe('ok');
    expect(counterIcon(1, 2)).toBe('warn');
    expect(counterIcon(0, 0)).toBe('pending');
  });

  it('normalizes snake_case backend payload', () => {
    const normalized = normalizeCtreCompileProgress({
      compile_id: 'abc-123',
      status: 'partial',
      score: 90,
      trigger: 'repair',
      counters: { POI: { done: 3, total: 3 } },
      updated_at: '2026-08-01T12:00:01.000Z',
    });
    expect(normalized?.compileId).toBe('abc-123');
    expect(normalized?.trigger).toBe('repair');
    expect(normalized?.counters.POI).toEqual({ done: 3, total: 3 });
  });
});
