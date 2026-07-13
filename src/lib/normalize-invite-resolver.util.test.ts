import { describe, expect, it } from 'vitest';
import {
  defaultTargetPathForKind,
  isInviteResolveNotFound,
  normalizeResolvedInvite,
  rewriteJoinTripInviteUrl,
} from './normalize-invite-resolver.util';

describe('normalize-invite-resolver.util', () => {
  it('normalizes unified resolve response', () => {
    const resolved = normalizeResolvedInvite(
      {
        kind: 'trip_member',
        token: 'abc',
        target_path: '/invite/abc',
        preview: {
          title: '冰岛',
          destination: 'IS',
          trip_id: 't1',
          label: '付款人',
        },
      },
      'fallback',
    );
    expect(resolved?.kind).toBe('trip_member');
    expect(resolved?.token).toBe('abc');
    expect(resolved?.targetPath).toBe('/invite/abc');
    expect(resolved?.preview?.tripId).toBe('t1');
    expect(resolved?.preview?.label).toBe('付款人');
  });

  it('defaults gate1 targetPath', () => {
    expect(defaultTargetPathForKind('gate1_participant', 'tok')).toBe('/participant/invites/tok');
    expect(defaultTargetPathForKind('team', 'tok')).toBe('/invite/tok');
  });

  it('detects NOT_FOUND wrapper', () => {
    expect(isInviteResolveNotFound({ success: false, error: { code: 'NOT_FOUND' } })).toBe(true);
    expect(isInviteResolveNotFound({ success: true, data: {} })).toBe(false);
  });

  it('rewrites join-trip invite URL', () => {
    expect(rewriteJoinTripInviteUrl('/join-trip/abc123', 'abc123')).toBe('/invite/abc123');
    expect(rewriteJoinTripInviteUrl('https://app.example/invite/abc123', 'abc123')).toBe(
      'https://app.example/invite/abc123',
    );
  });
});
