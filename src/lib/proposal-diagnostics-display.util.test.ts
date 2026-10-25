import { describe, expect, it } from 'vitest';
import {
  classifyProposalDiagnostic,
  groupProposalDiagnosticsForDisplay,
} from './proposal-diagnostics-display.util';

describe('proposal-diagnostics-display.util', () => {
  it('classifies overlap / same-day / cross-day', () => {
    expect(
      classifyProposalDiagnostic({ title: '第 1 天 13:30-14:30 与现有行程时间重叠' }),
    ).toBe('time_overlap');
    expect(
      classifyProposalDiagnostic({ title: '同日交通偏紧', message: '路上约需 6 小时' }),
    ).toBe('same_day_travel');
    expect(
      classifyProposalDiagnostic({ title: '跨天交通时间不足', message: '第2天 · 酒店 → 沙滩' }),
    ).toBe('cross_day_travel');
  });

  it('groups and dedupes category title + detail duplicate', () => {
    const groups = groupProposalDiagnosticsForDisplay([
      {
        id: 'a',
        title: '第1天 · 博物馆 → 钻石沙滩 (约 393.3 km): 路上约需 6 小时 33 分钟, 首项开始时间偏早',
      },
      {
        id: 'b',
        title: '同日交通偏紧',
        message:
          '第1天 · 博物馆 → 钻石沙滩 (约 393.3 km): 路上约需 6 小时 33 分钟, 首项开始时间偏早',
        source: 'trip_conflicts',
        dayIndex: 1,
      },
      {
        id: 'c',
        title: '第 1 天 13:30-14:30 与现有行程时间重叠',
      },
      {
        id: 'd',
        title: '跨天交通时间不足',
        message: '第2天 · 酒店 → 钻石沙滩 (约 175.2 km): 路上约需 2 小时 55 分钟',
        dayIndex: 1,
      },
    ]);

    expect(groups.map((g) => g.category)).toEqual([
      'time_overlap',
      'same_day_travel',
      'cross_day_travel',
    ]);
    expect(groups.find((g) => g.category === 'same_day_travel')?.items).toHaveLength(1);
    expect(groups.find((g) => g.category === 'time_overlap')?.items[0]?.primary).toContain(
      '重叠',
    );
  });
});
