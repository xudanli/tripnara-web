import { describe, expect, it } from 'vitest';
import { isSilentVoteCreateSuggestedOperation } from '@/lib/suggested-operations';

describe('isSilentVoteCreateSuggestedOperation', () => {
  it('matches 发起投票 label', () => {
    expect(
      isSilentVoteCreateSuggestedOperation({
        label: '发起投票',
        kind: 'client_navigation',
      })
    ).toBe(true);
  });

  it('matches silent_vote route', () => {
    expect(
      isSilentVoteCreateSuggestedOperation({
        label: '继续',
        kind: 'client_navigation',
        payload: { route: 'silent_vote_create' },
      })
    ).toBe(true);
  });

  it('ignores unrelated ops', () => {
    expect(
      isSilentVoteCreateSuggestedOperation({
        label: '打开时间轴',
        kind: 'client_navigation',
        payload: { route: 'timeline' },
      })
    ).toBe(false);
  });
});
