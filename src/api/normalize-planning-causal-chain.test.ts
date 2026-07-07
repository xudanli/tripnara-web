import { describe, expect, it } from 'vitest';
import { normalizePlanningCausalChain } from '@/api/normalize-planning-causal-chain';

describe('normalizePlanningCausalChain', () => {
  it('parses nodes and sorts by order', () => {
    const chain = normalizePlanningCausalChain(
      {
        schema: 'tripnara.planning_causal_chain@v1',
        tripId: 'trip-1',
        basis_updated_at: '2026-07-06T09:18:00.000Z',
        nodes: [
          {
            id: 'node_2',
            order: 1,
            severity: 'info',
            description: '缓冲被消耗',
          },
          {
            id: 'node_1',
            order: 0,
            severity: 'warn',
            description: '道路耗时增加',
            entity_label: '路段 A',
          },
        ],
      },
      'trip-1',
    );

    expect(chain.nodes).toHaveLength(2);
    expect(chain.nodes[0]?.id).toBe('node_1');
    expect(chain.nodes[1]?.severity).toBe('info');
    expect(chain.basisUpdatedAt).toBe('2026-07-06T09:18:00.000Z');
  });

  it('unwraps nested data envelope and parses full BFF sample', () => {
    const chain = normalizePlanningCausalChain(
      {
        data: {
          schema: 'tripnara.planning_causal_chain@v1',
          tripId: 'trip-1',
          nodes: [
            {
              id: 'node_1',
              order: 0,
              severity: 'info',
              description: '道路预计耗时增加 17 分钟（当前路段受交通与天气影响）',
              source: 'validation',
            },
            {
              id: 'node_3',
              order: 2,
              severity: 'warn',
              description: '哈尔格林姆教堂到达时间延后',
              entityLabel: '哈尔格林姆教堂',
              source: 'proposal',
            },
          ],
        },
      },
      'trip-1',
    );

    expect(chain.nodes).toHaveLength(2);
    expect(chain.nodes[0]?.description).toContain('道路预计耗时');
    expect(chain.nodes[1]?.entityLabel).toBe('哈尔格林姆教堂');
  });

  it('parses problemId and refreshUrl for problem mode', () => {
    const chain = normalizePlanningCausalChain(
      {
        schema: 'tripnara.planning_causal_chain@v1',
        tripId: 'trip-1',
        problemId: 'prob_a',
        refreshUrl: '/api/trips/trip-1/arrange-itinerary/decision-causal-chain?problemId=prob_a',
        nodes: [
          {
            id: 'node_1',
            order: 0,
            severity: 'warn',
            description: '道路耗时增加',
            source: 'readiness',
          },
        ],
      },
      'trip-1',
    );

    expect(chain.problemId).toBe('prob_a');
    expect(chain.refreshUrl).toContain('problemId=prob_a');
    expect(chain.nodes[0]?.source).toBe('readiness');
  });

  it('parses world_context and option_preview node sources', () => {
    const chain = normalizePlanningCausalChain(
      {
        schema: 'tripnara.planning_causal_chain@v1',
        tripId: 'trip-1',
        problemId: 'prob_a',
        nodes: [
          {
            id: 'env_1',
            order: 0,
            severity: 'info',
            description: '冰岛冬季日照窗口偏短',
            source: 'world_context',
          },
          {
            id: 'preview_1',
            order: 2,
            severity: 'warn',
            description: '调整到达时间后可缓解午餐窗冲突',
            source: 'option_preview',
          },
        ],
      },
      'trip-1',
    );

    expect(chain.nodes[0]?.source).toBe('world_context');
    expect(chain.nodes[1]?.source).toBe('option_preview');
  });
});
