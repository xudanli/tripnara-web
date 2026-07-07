import { describe, expect, it } from 'vitest';
import { resolveWorkbenchItineraryLoadingLabel } from '@/components/plan-studio/workbench/useWorkbenchItineraryData';

describe('resolveWorkbenchItineraryLoadingLabel', () => {
  it('returns phase-specific copy', () => {
    expect(resolveWorkbenchItineraryLoadingLabel('loading_schedule')).toBe('正在加载当日行程…');
    expect(resolveWorkbenchItineraryLoadingLabel('loading_travel')).toBe('正在核对交通时间…');
    expect(resolveWorkbenchItineraryLoadingLabel('loading_metrics')).toBe(
      '正在分析冲突与驾驶强度…',
    );
  });

  it('falls back to conflicts loading message', () => {
    expect(resolveWorkbenchItineraryLoadingLabel('idle', true)).toBe('正在同步规划冲突…');
  });
});
