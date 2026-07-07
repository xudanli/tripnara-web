import { describe, expect, it } from 'vitest';
import { Car } from 'lucide-react';
import {
  dedupeWorkbenchConflictLines,
  isDuplicateWorkbenchConflictLine,
} from '@/components/plan-studio/workbench/useWorkbenchItineraryData';
import type { WorkbenchConflictLine } from '@/components/plan-studio/workbench/useWorkbenchItineraryData';

const bufferLine = (id: string, detail: string): WorkbenchConflictLine => ({
  id,
  icon: Car,
  label: '交通缓冲偏紧',
  detail,
  severity: 'soft',
});

describe('workbench conflict line dedupe', () => {
  it('treats planning and metrics buffer conflicts as duplicate', () => {
    const detail =
      '第4天 · 瓦特纳冰川国家公园游客中心（斯卡夫塔山）→ 冰河湖（约 36.7 km）：路上约需 53 分钟，抵达后缓冲偏紧';
    const a = bufferLine('planning-1', detail);
    const b = bufferLine('metric-travel_buffer', detail);
    expect(isDuplicateWorkbenchConflictLine(a, b)).toBe(true);
    expect(dedupeWorkbenchConflictLines([a, b])).toHaveLength(1);
  });

  it('keeps distinct conflicts with different labels', () => {
    const lines: WorkbenchConflictLine[] = [
      bufferLine('a', '路线 A'),
      { id: 'b', icon: Car, label: '午餐时间窗过短', detail: '第4天', severity: 'soft' },
    ];
    expect(dedupeWorkbenchConflictLines(lines)).toHaveLength(2);
  });
});
