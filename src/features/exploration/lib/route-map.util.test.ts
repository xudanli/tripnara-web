import { describe, expect, it } from 'vitest';
import {
  buildFRoadLineFromDays,
  buildMainLineFromDayMapPoints,
  coerceLngLatLine,
  getRouteMapLayers,
  normalizeRouteMap,
  resolveRouteMapForDisplay,
} from '../lib/route-map.util';

describe('route-map.util', () => {
  it('buildMainLineFromDayMapPoints connects days in order', () => {
    const line = buildMainLineFromDayMapPoints([
      { day: 3, mapPoint: { lng: -19, lat: 63 } },
      { day: 1, mapPoint: { lng: -21.94, lat: 64.15 } },
      { day: 2, mapPoint: { lng: -20, lat: 64 } },
    ]);
    expect(line).toEqual([
      [-21.94, 64.15],
      [-20, 64],
      [-19, 63],
    ]);
  });

  it('resolveRouteMapForDisplay prefers API/fallback polyline over day straight lines', () => {
    const resolved = resolveRouteMapForDisplay({
      days: [
        { day: 1, mapPoint: { lng: 1, lat: 2 } },
        { day: 2, mapPoint: { lng: 3, lat: 4 } },
      ],
      map: { mainLine: [[9, 9], [8, 8], [7, 7]] },
    });
    expect(resolved?.mainLine).toEqual([
      [9, 9],
      [8, 8],
      [7, 7],
    ]);
  });

  it('resolveRouteMapForDisplay falls back to day anchors when no polyline', () => {
    const resolved = resolveRouteMapForDisplay({
      days: [
        { day: 1, mapPoint: { lng: 1, lat: 2 } },
        { day: 2, mapPoint: { lng: 3, lat: 4 } },
      ],
    });
    expect(resolved?.mainLine).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('buildFRoadLineFromDays links F-road days only', () => {
    const line = buildFRoadLineFromDays([
      { day: 1, mapPoint: { lng: 1, lat: 1 } },
      { day: 3, mapPoint: { lng: 3, lat: 3 }, tip: 'F 路需合规四驱' },
      { day: 5, mapPoint: { lng: 5, lat: 5 }, highlight: true },
    ]);
    expect(line).toEqual([
      [3, 3],
      [5, 5],
    ]);
  });

  it('coerceLngLatLine unwraps mistaken Directions result shape', () => {
    expect(
      coerceLngLatLine({
        line: [
          [-21.94, 64.15],
          [-19.01, 63.42],
        ],
        waypointLocations: [],
      }),
    ).toEqual([
      [-21.94, 64.15],
      [-19.01, 63.42],
    ]);
  });

  it('getRouteMapLayers prefers API layers metadata', () => {
    const layers = getRouteMapLayers({
      mainLine: [[-21.94, 64.15], [-19.01, 63.42]],
      fRoadLine: [[-19.06, 63.98], [-16.73, 65.05], [-19.0, 63.42]],
      layers: [
        { id: 'main', lineStyle: 'solid', label: '主路线' },
        { id: 'fRoad', lineStyle: 'dashed', requires4wd: true, label: 'F 路' },
      ],
    });

    expect(layers).toHaveLength(2);
    expect(layers[0]?.coordinates).toHaveLength(2);
    expect(layers[1]?.lineStyle).toBe('dashed');
    expect(layers[1]?.requires4wd).toBe(true);
    expect(layers[1]?.coordinates?.length).toBeGreaterThan(2);
  });

  it('getRouteMapLayers resolves coordinates from layer entries when top-level lines missing', () => {
    const layers = getRouteMapLayers({
      layers: [
        {
          id: 'main',
          lineStyle: 'solid',
          coordinates: [[-21.94, 64.15], [-19.01, 63.42]],
        },
        {
          id: 'fRoad',
          lineStyle: 'dashed',
          requires4wd: true,
          coordinates: [[-19.06, 63.98], [-16.73, 65.05]],
        },
      ],
    } as RouteMapGeometry);

    expect(layers).toHaveLength(2);
    expect(layers[0]?.coordinates).toHaveLength(2);
  });

  it('resolveRouteMapForDisplay prefers API fRoadLine over day-derived F segments', () => {
    const resolved = resolveRouteMapForDisplay({
      days: [{ day: 5, mapPoint: { lng: -16.73, lat: 65.05 }, tip: 'F 路需合规四驱', highlight: true }],
      map: {
        mainLine: [[-21.94, 64.15], [-19.01, 63.42]],
        fRoadLine: [[-19.06, 63.98], [-16.73, 65.05], [-19.0, 63.42]],
      },
    });

    expect(resolved?.fRoadLine?.length).toBe(3);
    expect(normalizeRouteMap(resolved)?.layers?.some((layer) => layer.id === 'fRoad')).toBe(true);
  });
});
