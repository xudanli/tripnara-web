import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  trackCollabCenterOpen,
  trackCollabTabSwitch,
  trackCollabPendingClick,
} from '@/utils/collab-center-analytics';

describe('collab-center-analytics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('trackCollabCenterOpen logs in dev', () => {
    trackCollabCenterOpen({ tripId: 't1', fromTab: 'schedule', memberCount: 4 });
    expect(console.log).toHaveBeenCalledWith(
      '[CollabCenterAnalytics]',
      'collab_center_open',
      expect.objectContaining({ trip_id: 't1', from_tab: 'schedule', member_count: 4 }),
    );
  });

  it('trackCollabTabSwitch includes collab_tab', () => {
    trackCollabTabSwitch({ tripId: 't1', collabTab: 'decisions' });
    expect(console.log).toHaveBeenCalledWith(
      '[CollabCenterAnalytics]',
      'collab_tab_switch',
      expect.objectContaining({ collab_tab: 'decisions' }),
    );
  });

  it('trackCollabPendingClick includes item metadata', () => {
    trackCollabPendingClick({ tripId: 't1', itemId: 'neg-1', itemType: 'negotiation' });
    expect(console.log).toHaveBeenCalledWith(
      '[CollabCenterAnalytics]',
      'collab_pending_click',
      expect.objectContaining({ item_id: 'neg-1', item_type: 'negotiation' }),
    );
  });
});
