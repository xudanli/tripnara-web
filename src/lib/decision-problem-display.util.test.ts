import { describe, expect, it } from 'vitest';
import {
  collectTradeoffDimensions,
  collectImpactScopeDisplayItems,
  collectImpactScopeDisplayLines,
  formatTradeoffCell,
  primaryEnforcementAccentClass,
  primaryEnforcementLabel,
  resolveApproverLabel,
  resolveSourceRefId,
  resolveTripConstraintRefId,
  decisionOptionLabel,
  decisionOptionSourceLabel,
  isGateOnlyProblem,
  mapDecisionOptionsToCheckerScenarios,
  resolveDecisionProblemDescription,
  dedupeAffectedScopeDisplay,
  executionCapabilityConfirmLabel,
  isTerminalExecutionStatus,
} from '@/lib/decision-problem-display.util';
import { isBlockingPrimaryEnforcement } from '@/lib/decision-problem-enforcement.util';

describe('decision-problem-display.util', () => {
  it('maps primaryEnforcement to accent classes', () => {
    expect(primaryEnforcementAccentClass('BLOCK')).toContain('red');
    expect(primaryEnforcementAccentClass('REQUIRE_ADJUSTMENT')).toContain('amber');
    expect(primaryEnforcementLabel('WARN')).toBe('提示');
  });

  it('collects tradeoff dimensions in stable order', () => {
    expect(
      collectTradeoffDimensions([
        { tradeoffs: [{ dimension: 'COST', direction: 'WORSEN', explanation: 'x' }] },
        { tradeoffs: [{ dimension: 'TIME', direction: 'IMPROVE', explanation: 'y' }] },
      ]),
    ).toEqual(['TIME', 'COST']);
  });

  it('formats tradeoff cells with direction symbol when no value', () => {
    expect(
      formatTradeoffCell({
        dimension: 'TIME',
        direction: 'IMPROVE',
        explanation: '省 2 小时',
      }),
    ).toContain('↑');
  });

  it('formats tradeoff cells with numeric value + unit', () => {
    expect(
      formatTradeoffCell({
        dimension: 'TIME',
        direction: 'WORSEN',
        value: 30,
        unit: 'MINUTE',
        explanation: '当日总时长略增',
      }),
    ).toBe('+30 分钟 · 当日总时长略增');
  });

  it('resolves approver labels', () => {
    expect(resolveApproverLabel({ approver: 'TRIP_OWNER' })).toBe('行程发起人确认');
  });

  it('resolves feasibility issue id from sourceRefs', () => {
    expect(
      resolveSourceRefId({
        sourceRefs: [{ system: 'FEASIBILITY', refId: 'issue-drive-d3' }],
      }),
    ).toBe('issue-drive-d3');
  });

  it('labels gate rule engine options', () => {
    expect(decisionOptionLabel({ id: 'gate_reach_alt_route' })).toBe('换路线');
    expect(decisionOptionSourceLabel('RULE_ENGINE')).toBe('规则引擎');
  });

  it('prefers API title over label and never shows raw action id', () => {
    expect(
      decisionOptionLabel({
        id: 'SHIFT_ARRIVAL',
        title: '改到达时刻',
        label: '旧 label',
      }),
    ).toBe('改到达时刻');
    expect(
      decisionOptionLabel({
        id: 'planb_0_poi-access',
        title: 'SHIFT_ARRIVAL',
        description: '大风或涨潮时避免靠近危险区域',
      }),
    ).toBe('改到达时刻');
    expect(
      decisionOptionLabel({
        id: 'planb_1_poi-access',
        title: 'USE_ALTERNATIVE',
        description: '关注 SafeTravel.is 最新安全公告',
      }),
    ).toBe('替代 POI');
  });

  it('maps execution capability to confirm labels', () => {
    expect(executionCapabilityConfirmLabel('DIRECT')).toBe('确认并应用');
    expect(executionCapabilityConfirmLabel('GUIDED_MANUAL')).toBe('查看手动步骤');
    expect(executionCapabilityConfirmLabel('ADVISORY_ONLY')).toBe('查看建议');
    expect(isTerminalExecutionStatus('APPLYING')).toBe(false);
    expect(isTerminalExecutionStatus('RESOLVED')).toBe(true);
  });

  it('detects gate-only problems', () => {
    expect(isGateOnlyProblem({ detectedBy: 'GATE' })).toBe(true);
    expect(isGateOnlyProblem({ semanticKey: 'gate:reachability' })).toBe(true);
  });

  it('collectImpactScopeDisplayItems splits entity and fact', () => {
    const items = collectImpactScopeDisplayItems({
      assertions: [
        {
          proofs: [
            {
              entity: '第4天 · 拉特拉尔角 → 红沙滩',
              currentFact: '路程约 1916.9 km',
            },
          ],
        },
      ],
    });
    expect(items[0]?.entity).toContain('拉特拉尔角');
    expect(items[0]?.fact).toContain('1916.9');
  });

  it('collectImpactScopeDisplayLines prefers proofs entity over affectedScope ids', () => {
    const lines = collectImpactScopeDisplayLines({
      affectedDayNumbers: [4],
      assertions: [
        {
          proofs: [
            {
              entity: '第4天 · 拉特拉尔角海鸟悬崖 → 红沙滩',
              currentFact: '路程约 1916.9 km；路上约需 31 小时 57 分钟',
            },
          ],
        },
      ],
    });
    expect(lines).toEqual([
      '第4天 · 拉特拉尔角海鸟悬崖 → 红沙滩：路程约 1916.9 km；路上约需 31 小时 57 分钟',
    ]);
  });

  it('collectImpactScopeDisplayLines falls back to day numbers', () => {
    expect(collectImpactScopeDisplayLines({ affectedDayNumbers: [2, 3] })).toEqual([
      '第 2、3 天',
    ]);
  });

  it('maps decision options to scenario cards', () => {
    const scenarios = mapDecisionOptionsToCheckerScenarios([
      {
        id: 'opt_a',
        title: '前往官方预订',
        description: '需提前预约',
        tradeoffs: [{ dimension: 'CERTAINTY', direction: 'IMPROVE', value: 8 }],
      },
      { id: 'opt_b', title: '上传凭证', description: '已有预约' },
    ]);
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0]?.title).toBe('前往官方预订');
    expect(scenarios[0]?.letter).toBe('A');
    expect(scenarios[1]?.badge).toBe('alternative');
  });

  it('resolves problem description from detail', () => {
    expect(
      resolveDecisionProblemDescription({
        id: 'p1',
        type: 'RISK',
        title: '紧急电话',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_CONFIRMATION',
        description: '请确认冰岛紧急电话',
      }),
    ).toBe('请确认冰岛紧急电话');
  });

  it('drops redundant single-poi scope when route scope exists on same day', () => {
    const items = dedupeAffectedScopeDisplay([
      {
        scopeType: 'LEG',
        scopeId: 'leg-1',
        label: '第 1 天 · 蓝湖温泉 -> 哈尔格林姆斯教堂',
        secondaryLabel: '39km 自驾路段',
        dayIndex: 1,
        placeNames: ['蓝湖温泉', '哈尔格林姆斯教堂'],
      },
      {
        scopeType: 'ITINERARY_ITEM',
        scopeId: 'poi-1',
        label: '蓝湖温泉',
        dayIndex: 1,
        placeNames: ['蓝湖温泉'],
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.label).toContain('蓝湖温泉');
  });
});

describe('isBlockingPrimaryEnforcement', () => {
  it('detects BLOCK enforcement', () => {
    expect(isBlockingPrimaryEnforcement('BLOCK')).toBe(true);
    expect(isBlockingPrimaryEnforcement('WARN')).toBe(false);
  });
});
