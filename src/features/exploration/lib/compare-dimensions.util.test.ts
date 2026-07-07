import { describe, expect, it } from 'vitest';
import {
  buildCompareDimensionsFromCandidates,
  extractCompareDimensionsRaw,
  getCompareDimensionValue,
  normalizeApiCompareDimensions,
  resolveCompareDimensionsFromPayload,
} from './compare-dimensions.util';

const sampleRoute = {
  id: 'south-depth',
  apiRouteId: 'route_south-depth',
  title: '南岸深度',
  gains: [],
  sacrifices: [],
};

describe('compare-dimensions.util', () => {
  it('reads cell by apiRouteId', () => {
    const dimension = {
      key: 'exploration',
      label: '探索感',
      values: {
        'route_south-depth': { level: '中高', note: '深入小镇与冰川' },
      },
    };

    expect(getCompareDimensionValue(dimension, sampleRoute)).toEqual({
      level: '中高',
      note: '深入小镇与冰川',
    });
  });

  it('reads backend composite key route_{dimensionKey}-{strategyId}', () => {
    const route = { ...sampleRoute, id: 'ring-compressed', apiRouteId: 'route_ring-compressed' };
    const dimension = {
      key: 'coverage',
      label: '覆盖范围',
      values: {
        'route_coverage-ring-compressed': { level: '广', note: '环岛覆盖' },
      },
    };

    expect(getCompareDimensionValue(dimension, route)).toEqual({
      level: '广',
      note: '环岛覆盖',
    });
  });

  it('reads cells spread on dimension row when values is missing', () => {
    const route = { ...sampleRoute, id: 'ring-compressed', apiRouteId: 'route_ring-compressed' };
    const dimension = {
      key: 'coverage',
      label: '覆盖范围',
      'route_coverage-ring-compressed': { level: '广', note: '环岛覆盖' },
    };

    expect(getCompareDimensionValue(dimension as never, route)).toEqual({
      level: '广',
      note: '环岛覆盖',
    });
  });

  it('normalizes dimension rows without explicit key by inferring from composite keys', () => {
    const normalized = normalizeApiCompareDimensions([
      {
        label: '覆盖范围',
        'route_coverage-ring-compressed': { level: '广', note: '环岛覆盖' },
        'route_coverage-south-depth': { level: '中', note: '南岸为主' },
      },
    ]);

    expect(normalized?.[0]?.key).toBe('coverage');
    expect(normalized?.[0]?.label).toBe('覆盖范围');
    expect(normalized?.[0]?.values['route_coverage-ring-compressed']?.level).toBe('广');
  });

  it('normalizes object-shaped API dimensions', () => {
    const normalized = normalizeApiCompareDimensions({
      coverage: {
        'route_coverage-ring-compressed': { level: '广', note: '环岛覆盖' },
      },
    });

    expect(normalized?.[0]?.key).toBe('coverage');
    expect(normalized?.[0]?.values['route_coverage-ring-compressed']?.level).toBe('广');
  });

  it('extracts dimensions from compareDimensions alias', () => {
    const raw = extractCompareDimensionsRaw({
      candidates: [],
      compareDimensions: [{ key: 'exploration', label: '探索感', values: {} }],
    });
    expect(Array.isArray(raw)).toBe(true);
  });

  it('builds dimensions from candidate.compare when top-level missing', () => {
    const dimensions = buildCompareDimensionsFromCandidates([
      {
        routeId: 'route_south-depth',
        strategyId: 'south-depth',
        compare: {
          exploration: { level: '中高', note: '深入小镇' },
        },
      },
    ]);

    expect(dimensions?.[0]?.key).toBe('exploration');
    expect(dimensions?.[0]?.values['route_exploration-south-depth']?.level).toBe('中高');
  });

  it('joins dimension definitions with candidate metrics scores', () => {
    const dimensions = resolveCompareDimensionsFromPayload(
      {
        dimensions: [
          { key: 'exploration', label: '探索感', higherIsBetter: true },
          { key: 'drivingIntensity', label: '驾驶强度', higherIsBetter: false },
        ],
      },
      [
        {
          routeId: 'route_coverage-ring-compressed',
          strategyId: 'coverage-ring-compressed',
          metrics: { exploration: 0.32, drivingIntensity: 0.75 },
        },
        {
          routeId: 'route_depth-south-coast',
          strategyId: 'depth-south-coast',
          metrics: { exploration: 0.55, drivingIntensity: 0.4 },
        },
      ],
    );

    expect(dimensions).toHaveLength(2);
    expect(dimensions[0]?.label).toBe('探索感');
    expect(
      getCompareDimensionValue(dimensions[0]!, {
        id: 'route_coverage-ring-compressed',
        apiRouteId: 'route_coverage-ring-compressed',
        title: '环岛压缩',
        gains: [],
        sacrifices: [],
      })?.level,
    ).toBe('32%');
    expect(
      getCompareDimensionValue(dimensions[1]!, {
        id: 'route_coverage-ring-compressed',
        apiRouteId: 'route_coverage-ring-compressed',
        title: '环岛压缩',
        gains: [],
        sacrifices: [],
      })?.level,
    ).toBe('75%');
  });

  it('extracts dimensions nested under compare object', () => {
    const dimensions = resolveCompareDimensionsFromPayload({
      candidates: [],
      compare: {
        exploration: {
          label: '探索深度',
          'route_exploration-route_south-depth': { level: '高' },
        },
      },
    });

    expect(dimensions).toHaveLength(1);
    expect(dimensions[0]?.key).toBe('exploration');
    expect(dimensions[0]?.label).toBe('探索深度');
  });

  it('returns empty array when API dimensions missing', () => {
    expect(resolveCompareDimensionsFromPayload({}, [])).toEqual([]);
  });

  it('uses API dimensions when present', () => {
    const dimensions = resolveCompareDimensionsFromPayload({
      dimensions: [
        {
          key: 'exploration',
          label: '探索深度',
          values: { 'route_south-depth': { level: '高' } },
        },
      ],
    });
    expect(dimensions).toHaveLength(1);
    expect(dimensions[0]?.label).toBe('探索深度');
  });
});
