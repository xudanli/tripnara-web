import { describe, expect, it } from 'vitest';
import {
  consolidateDestinationInsightEntries,
  splitDestinationInsightSummary,
} from '@/lib/destination-insight-display.util';

describe('consolidateDestinationInsightEntries', () => {
  it('merges duplicate titles and combines unique summaries', () => {
    const consolidated = consolidateDestinationInsightEntries([
      {
        id: 'a1',
        title: '交通缓冲偏紧',
        summary: '第 1 天：蓝湖温泉 → 哈尔格林姆斯教堂（约 38.6 km）：行车约 46 分钟，到达后缓冲偏紧。',
        sourceRefs: [{ label: '交通缓冲偏紧' }],
      },
      {
        id: 'a2',
        title: '交通缓冲偏紧',
        summary: '第 1 天：蓝湖温泉 → 哈尔格林姆斯教堂（约 38.6 km）：行车约 46 分钟，到达后缓冲偏紧。',
        sourceRefs: [{ system: 'TIME', refId: 'TIME' }],
      },
      {
        id: 'b1',
        title: '第 1 天 · 蓝湖温泉 → 哈尔格林姆斯教堂',
        summary: '距离约 38.6 km；行车约 46 分钟；方式：DRIVING',
      },
      {
        id: 'b2',
        title: '第 1 天 · 蓝湖温泉 → 哈尔格林姆斯教堂',
        summary: '出发 11:00；行车约 46 分钟；到达约 11:46；活动开始 12:12',
      },
    ]);

    expect(consolidated).toHaveLength(2);
    expect(consolidated[0]?.title).toBe('交通缓冲偏紧');
    expect(consolidated[0]?.sourceRefs).toHaveLength(2);
    expect(consolidated[1]?.summary).toContain('距离约 38.6 km');
    expect(consolidated[1]?.summary).toContain('出发 11:00');
  });
});

describe('splitDestinationInsightSummary', () => {
  it('splits merged summaries into lines', () => {
    expect(splitDestinationInsightSummary('a\nb')).toEqual(['a', 'b']);
  });
});
