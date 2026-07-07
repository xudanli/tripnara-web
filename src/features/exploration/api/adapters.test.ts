import { describe, expect, it } from 'vitest';
import {
  mapCompareCandidatesFromApi,
  mergeCandidatesWithMock,
  mergeRouteDetailWithMock,
  normalizeLabeledItems,
} from './adapters';
import { normalizeRouteMap } from '../lib/route-map.util';

describe('exploration adapters', () => {
  it('normalizeLabeledItems converts { id, label } to strings', () => {
    expect(
      normalizeLabeledItems([
        { id: 'gain_remote', label: '高地探索体验' },
        'plain string',
      ]),
    ).toEqual(['高地探索体验', 'plain string']);
  });

  it('mapCompareCandidatesFromApi maps API fields without mock fallback', () => {
    const routes = mapCompareCandidatesFromApi([
      {
        routeId: 'route_remote-highlands-south',
        strategyId: 'remote-highlands-south',
        title: '高地探索 + 南岸',
        gains: [{ id: 'gain_remote', label: '高地独特地貌' }],
        sacrifices: [{ id: 'sac_vehicle', label: '车辆与道路要求高' }],
        matchScore: 88,
        matchSummary: '匹配你的探索偏好',
        preview: {
          map: {
            mainLine: [
              [-21.94, 64.15],
              [-19.01, 63.42],
            ],
            fRoadLine: [[-19.06, 63.98], [-16.73, 65.05]],
            layers: [
              { id: 'main', lineStyle: 'solid', label: '主路线' },
              { id: 'fRoad', lineStyle: 'dashed', requires4wd: true, label: 'F 路' },
            ],
          },
        },
      },
    ]);
    expect(routes[0]?.title).toBe('高地探索 + 南岸');
    expect(routes[0]?.gains[0]).toBe('高地独特地貌');
    expect(routes[0]?.apiRouteId).toBe('route_remote-highlands-south');
    expect(routes[0]?.id).toBe('route_remote-highlands-south');
    expect(routes[0]?.matchScore).toBe(88);
    expect(routes[0]?.previewMap?.mainLine).toHaveLength(2);
    expect(routes[0]?.previewMap?.fRoadLine).toHaveLength(2);
    expect(routes[0]?.previewMap?.layers?.some((layer) => layer.id === 'fRoad')).toBe(true);
  });

  it('mergeCandidatesWithMock normalizes API gains/sacrifices and preview map', () => {
    const routes = mergeCandidatesWithMock([
      {
        routeId: 'route_remote-highlands-south',
        strategyId: 'remote-highlands-south',
        title: '高地探索 + 南岸',
        gains: [{ id: 'gain_remote', label: '高地独特地貌' }],
        sacrifices: [{ id: 'sac_vehicle', label: '车辆与道路要求高' }],
        preview: {
          map: {
            mainLine: [
              [-21.94, 64.15],
              [-19.01, 63.42],
            ],
          },
        },
      },
    ]);
    expect(routes[0].gains[0]).toBe('高地独特地貌');
    expect(routes[0].apiRouteId).toBe('route_remote-highlands-south');
    expect(routes[0].sacrifices[0]).toBe('车辆与道路要求高');
    expect(routes[0].previewMap?.mainLine).toHaveLength(2);
  });

  it('mergeRouteDetailWithMock merges days and map from API', () => {
    const { route, apiRouteId } = mergeRouteDetailWithMock(
      {
        routeId: 'route_remote-highlands-south',
        strategyId: 'remote-highlands-south',
        title: '高地探索 + 南岸',
        detail: {
          summary: 'API summary',
          totalKm: 960,
          avgDrivingHours: 3.6,
          stayChanges: 4,
          regions: ['南岸', '高地'],
          days: [
            {
              day: 1,
              theme: '南岸热身',
              route: '雷克雅未克 → 南岸',
              driving: '2.8h',
              experience: '瀑布与黑沙滩',
              stay: 'Vík',
              mapPoint: { lng: -21.9426, lat: 64.1466 },
            },
          ],
          map: {
            mainLine: { type: 'LineString', coordinates: [[-21.94, 64.15], [-19.01, 63.42]] },
            fRoadLine: [[-19.06, 63.98], [-16.73, 65.05]],
          },
        },
      },
      'remote-highlands-south',
    );
    expect(apiRouteId).toBe('route_remote-highlands-south');
    expect(route.detail.summary).toBe('API summary');
    expect(route.detail.days[0].mapPoint).toEqual({ lng: -21.9426, lat: 64.1466 });
    expect(route.detail.map?.mainLine).toHaveLength(2);
    expect(route.detail.map?.fRoadLine).toHaveLength(2);
  });

  it('normalizeRouteMap accepts coordinate arrays and GeoJSON', () => {
    expect(
      normalizeRouteMap({
        mainLine: [[1, 2], [3, 4]],
      })?.mainLine,
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(
      normalizeRouteMap({
        mainLine: { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
      })?.mainLine,
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});
