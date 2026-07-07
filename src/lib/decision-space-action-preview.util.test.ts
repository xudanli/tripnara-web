import { describe, expect, it } from 'vitest';
import { buildDecisionSpaceActionPreviewView, actionPreviewHasIncrementalContent } from './decision-space-action-preview.util';

describe('decision-space-action-preview.util', () => {
  it('extracts before/after from preview tradeoffs', () => {
    const view = buildDecisionSpaceActionPreviewView({
      preview: {
        optionId: 'opt_a',
        tradeoffs: [
          {
            dimension: 'TIME',
            direction: 'IMPROVE',
            explanation: '原方案 6h42m → 调整后 3h18m',
          },
        ],
      },
      optionIndex: 0,
    });
    expect(view?.comparison?.before).toContain('6h42m');
    expect(view?.comparison?.after).toContain('3h18m');
    expect(view?.supportPct).toBeGreaterThan(50);
    expect(view?.itineraryDiff).toEqual([]);
    expect(view?.scheduleNavigation).toBeNull();
  });

  it('formats ISO timestamps in mutation lines', () => {
    const view = buildDecisionSpaceActionPreviewView({
      preview: {
        optionId: 'opt_a',
        proposedMutations: {
          operations: [
            {
              description: '2026-08-01T11:33:00.000+00:00 · 调整下一项',
            },
          ],
        },
      },
      displayTimezone: 'Atlantic/Reykjavik',
    });
    expect(view?.mutationLines[0]).toContain('8月1日');
    expect(view?.mutationLines[0]).not.toContain('T11:33:00');
  });

  it('marks summary-only preview as non-incremental', () => {
    const view = buildDecisionSpaceActionPreviewView({
      action: {
        actionId: 'a1',
        summary: '将斯科加瀑布开始时间调整到 7月22日 11:33',
        allowed: true,
      } as never,
      matchedOption: {
        id: 'a1',
        tradeoffs: [{ dimension: 'TIME', direction: 'IMPROVE', explanation: '缓冲改善' }],
      },
      optionIndex: 0,
    });
    expect(view?.summary).toBeTruthy();
    expect(view?.supportPct).toBeGreaterThan(0);
    expect(actionPreviewHasIncrementalContent(view)).toBe(false);
  });

  it('marks before/after preview as incremental', () => {
    const view = buildDecisionSpaceActionPreviewView({
      preview: {
        optionId: 'opt_a',
        tradeoffs: [
          {
            dimension: 'TIME',
            direction: 'IMPROVE',
            explanation: '原方案 6h42m → 调整后 3h18m',
          },
        ],
      },
    });
    expect(actionPreviewHasIncrementalContent(view)).toBe(true);
  });
});
