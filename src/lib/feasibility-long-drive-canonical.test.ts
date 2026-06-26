import { describe, expect, it } from 'vitest';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import { mergeLongDriveIssues, resolveFeasibilityRepairIssueId } from './feasibility-ultra-long-drive';

const gapIssue: FeasibilityIssueDto = {
  id: 'issue-gap-10-long_distance',
  priority: 'must_handle',
  category: 'transport',
  title: '超长距离',
  message:
    '第4天 · 钻石沙滩 → 蓝湖温泉（约 304 km）· 超长距离行驶(>300km)，强烈建议分段或中途住宿',
  severity: 'high',
};

const transportIssue: FeasibilityIssueDto = {
  id: 'issue-transport-seg-8-long_distance',
  priority: 'suggest_adjust',
  category: 'transport',
  title: '超长距离',
  message: '第4天 · 钻石沙滩 → 蓝湖温泉 · 超长距离行驶(>300km)，强烈建议分段或中途住宿',
  severity: 'high',
  issueKind: 'road_class',
  uiHints: { primaryAction: 'open_repair' },
};

describe('long drive issue canonicalization', () => {
  it('resolves repair API issue id to transport-seg canonical id', () => {
    expect(resolveFeasibilityRepairIssueId(gapIssue, [gapIssue, transportIssue])).toBe(
      'issue-transport-seg-8-long_distance',
    );
  });

  it('merges duplicate long-drive issues to transport-seg id', () => {
    const merged = mergeLongDriveIssues(gapIssue, transportIssue);
    expect(merged.id).toBe('issue-transport-seg-8-long_distance');
    expect(merged.priority).toBe('must_handle');
    expect(merged.issueKind).toBe('road_class');
    expect(merged.uiHints?.primaryAction).toBe('open_repair');
  });
});
