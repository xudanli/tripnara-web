import { describe, expect, it } from 'vitest';
import {
  clearCollabDeepLinkKeys,
  mergeCollabDeepLink,
} from './collab-center-navigation';

describe('collab-center-navigation', () => {
  it('mergeCollabDeepLink sets collab=1 and collabTab', () => {
    const base = new URLSearchParams('tab=schedule&foo=1');
    const next = mergeCollabDeepLink(base, { collabTab: 'decisions', voteId: 'v1' });
    expect(next.get('tab')).toBe('schedule');
    expect(next.get('collab')).toBe('1');
    expect(next.get('collabTab')).toBe('decisions');
    expect(next.get('voteId')).toBe('v1');
    expect(next.get('foo')).toBe('1');
  });

  it('mergeCollabDeepLink migrates legacy tab=team to schedule', () => {
    const base = new URLSearchParams('tab=team&collabTab=members');
    const next = mergeCollabDeepLink(base, { collabTab: 'decisions' });
    expect(next.get('tab')).toBe('schedule');
    expect(next.get('collab')).toBe('1');
    expect(next.get('collabTab')).toBe('decisions');
  });

  it('mergeCollabDeepLink clears deep link keys when null', () => {
    const base = new URLSearchParams('tab=schedule&collab=1&collabTab=decisions&voteId=v1&wishId=w1');
    const next = mergeCollabDeepLink(base, { voteId: null, wishId: null });
    expect(next.has('voteId')).toBe(false);
    expect(next.has('wishId')).toBe(false);
  });

  it('clearCollabDeepLinkKeys removes collab query keys', () => {
    const base = new URLSearchParams(
      'tab=schedule&collab=1&collabTab=wishes&wishId=w1&roundId=r1&roundDomain=budget&taskFilter=prep',
    );
    const next = clearCollabDeepLinkKeys(base);
    expect(next.get('tab')).toBe('schedule');
    expect(next.has('collab')).toBe(false);
    expect(next.has('collabTab')).toBe(false);
    expect(next.has('wishId')).toBe(false);
    expect(next.has('roundId')).toBe(false);
    expect(next.has('roundDomain')).toBe(false);
    expect(next.has('taskFilter')).toBe(false);
  });
});
