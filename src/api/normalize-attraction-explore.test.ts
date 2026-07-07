import { describe, expect, it } from 'vitest';
import {
  normalizeAttractionExploreCandidates,
  normalizeAttractionExploreContext,
  normalizeAttractionExploreMap,
  normalizeAttractionExploreRecommendations,
  normalizeExploreIntentResponse,
} from './normalize-attraction-explore';

describe('normalize-attraction-explore', () => {
  it('maps BFF context fields to frontend shape', () => {
    const normalized = normalizeAttractionExploreContext({
      themes: [{ id: 'photography', label: '摄影打卡' }],
      suitabilities: [{ id: 'family', label: '亲子家庭' }],
      selectedFilters: {
        themeIds: ['photography'],
        suitabilityIds: ['family'],
        viewTab: 'map',
      },
      travelConditions: {
        origin: '凯夫拉维克机场 (KEF)',
        transportMode: 'self_drive',
        pace: 'moderate',
        weatherHint: '偏冷多风',
      },
      memberPreferences: {
        memberCount: 2,
        topThemes: ['photography'],
        topSuitabilities: ['family'],
      },
    });

    expect(normalized.suitability).toHaveLength(1);
    expect(normalized.selectedThemeIds).toEqual(['photography']);
    expect(normalized.selectedViewTab).toBe('map');
    expect(normalized.tripContext.departureLabel).toBe('凯夫拉维克机场 (KEF)');
    expect(normalized.tripContext.transportLabel).toBe('自驾');
    expect(normalized.tripContext.paceLabel).toBe('适中节奏');
    expect(normalized.memberPreferences.summary).toContain('摄影打卡');
  });

  it('maps BFF recommendation groups to sections', () => {
    const normalized = normalizeAttractionExploreRecommendations({
      groups: [
        {
          groupId: 'first_time_must_see',
          title: '第一次来最值得去',
          items: [
            {
              id: 381084,
              placeId: 381084,
              attractionId: 'd740872f-df78-43b5-a709-7e8f1e787e21',
              name: '黄金瀑布',
              category: 'ATTRACTION',
              region: 'Reykjavík',
              description: '瀑布',
              meta: { requiresReservation: false },
            },
          ],
        },
      ],
    });

    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0]?.id).toBe('first_time_must_see');
    expect(normalized.sections[0]?.items[0]?.id).toBe('d740872f-df78-43b5-a709-7e8f1e787e21');
    expect(normalized.sections[0]?.items[0]?.categoryLabel).toBe('景点');
    expect(normalized.sections[0]?.items[0]?.metadata.bookingRequired).toBe(false);
  });

  it('normalizes candidates summary route span from backend', () => {
    const normalized = normalizeAttractionExploreCandidates({
      candidates: [
        {
          id: 'c1',
          name: '凯瑞斯火山口',
          priority: 'very_interested',
          sortOrder: 0,
        },
      ],
      summary: {
        attractionCount: 9,
        estimatedDays: 2,
        routeSpanKm: 975,
      },
    });

    expect(normalized.summary.routeSpanKm).toBe(975);
  });

  it('maps experience_gap group with default subtitle', () => {
    const normalized = normalizeAttractionExploreRecommendations({
      groups: [
        {
          groupId: 'experience_gap',
          title: '补足行程体验',
          items: [],
        },
      ],
    });

    expect(normalized.sections[0]?.groupKind).toBe('experience_gap');
    expect(normalized.sections[0]?.subtitle).toBe('基于当前行程体验覆盖缺口推荐');
  });

  it('derives detour badge from meta.detourMinutes', () => {
    const normalized = normalizeAttractionExploreRecommendations({
      groups: [
        {
          groupId: 'along_route',
          title: '顺路推荐',
          items: [
            {
              id: 'place-1',
              name: '间歇泉',
              meta: { detourMinutes: 18 },
            },
          ],
        },
      ],
    });

    expect(normalized.sections[0]?.items[0]?.badge).toBe('绕路约 18 分钟');
  });

  it('normalizes candidate precheck warnings', () => {
    const normalized = normalizeAttractionExploreCandidates({
      candidates: [
        {
          id: 'c1',
          name: '蓝湖',
          priority: 'must_go',
          sortOrder: 0,
        },
      ],
      summary: { attractionCount: 1, estimatedDays: 1, routeSpanKm: 0 },
      precheck: {
        feasible: true,
        warnings: [
          {
            code: 'must_go_exceeds_days',
            message: '必去景点预计超出可用天数',
            severity: 'warn',
          },
        ],
      },
    });

    expect(normalized.precheck?.feasible).toBe(true);
    expect(normalized.precheck?.warnings[0]?.code).toBe('must_go_exceeds_days');
  });

  it('normalizes map pois with insertHint', () => {
    const normalized = normalizeAttractionExploreMap({
      pois: [
        {
          id: 'candidate-1',
          placeId: 381382,
          name: '蓝湖',
          coordinates: { lat: 63.88, lng: -22.45 },
          kind: 'candidate',
          insertHint: {
            suggestedDayIndex: 2,
            detourMinutes: 22,
            startTime: '15:30',
          },
        },
      ],
    });

    expect(normalized.points[0]?.insertHint?.suggestedDayIndex).toBe(2);
    expect(normalized.points[0]?.insertHint?.detourMinutes).toBe(22);
  });

  it('normalizes search compiledIntent', () => {
    const normalized = normalizeAttractionExploreRecommendations({
      groups: [],
      compiledIntent: {
        themes: [{ id: 'nature', label: '自然风光' }],
        maxDetourMinutes: 30,
        routeContext: '黄金圈',
      },
    });

    expect(normalized.compiledIntent?.themes?.[0]?.id).toBe('nature');
    expect(normalized.compiledIntent?.maxDetourMinutes).toBe(30);
  });

  it('normalizes explore-intent response', () => {
    const normalized = normalizeExploreIntentResponse({
      tripId: 'trip-1',
      query: '适合老人沿黄金圈',
      suitableFor: [{ id: 'elderly', label: '适合老人' }],
      maxDetourMinutes: 25,
      source: 'rules+llm',
    });

    expect(normalized.suitableFor?.[0]?.id).toBe('elderly');
    expect(normalized.maxDetourMinutes).toBe(25);
    expect(normalized.source).toBe('rules+llm');
  });

  it('normalizes detourMethod on item metadata', () => {
    const normalized = normalizeAttractionExploreRecommendations({
      groups: [
        {
          groupId: 'along_route',
          title: '顺路',
          items: [
            {
              id: 'p1',
              name: '蓝湖',
              meta: { detourMinutes: 12, detourMethod: 'live_route_api' },
            },
          ],
        },
      ],
    });

    expect(normalized.sections[0]?.items[0]?.metadata.detourMethod).toBe('live_route_api');
  });

  it('normalizes copilotNextAction on add candidate', () => {
    const normalized = normalizeAttractionExploreCandidates({
      candidates: [
        {
          id: 'c1',
          name: '蓝湖',
          priority: 'must_go',
          sortOrder: 0,
        },
      ],
      summary: { attractionCount: 1, estimatedDays: 1, routeSpanKm: 0 },
      copilotNextAction: {
        action: 'draft_for_candidate',
        candidateId: 'c1',
        endpoint: '/api/trips/trip-1/arrange-itinerary/copilot-actions',
      },
    });

    expect(normalized.copilotNextAction?.action).toBe('draft_for_candidate');
    expect(normalized.copilotNextAction?.candidateId).toBe('c1');
  });

  it('normalizes map pois with nested coordinates', () => {
    const normalized = normalizeAttractionExploreMap({
      pois: [
        {
          id: 'candidate-1',
          placeId: 381375,
          name: '凯瑞斯火山口',
          coordinates: { lat: 64.0413, lng: -20.8851 },
          kind: 'candidate',
        },
      ],
    });

    expect(normalized.points).toHaveLength(1);
    expect(normalized.points[0]?.lat).toBeCloseTo(64.0413);
    expect(normalized.points[0]?.lng).toBeCloseTo(-20.8851);
  });

  it('normalizes candidates summary null route span to zero', () => {
    const normalized = normalizeAttractionExploreCandidates({
      candidates: [
        {
          id: 'c1',
          name: '凯瑞斯火山口',
          priority: 'very_interested',
          sortOrder: 0,
        },
      ],
      summary: {
        attractionCount: 8,
        estimatedDays: 2,
        routeSpanKm: null,
      },
    });

    expect(normalized.candidates).toHaveLength(1);
    expect(normalized.summary.routeSpanKm).toBe(0);
  });
});
