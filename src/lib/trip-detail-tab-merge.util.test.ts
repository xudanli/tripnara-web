import { describe, expect, it } from 'vitest';
import { TRIP_DETAIL_TAB_BFF_INCLUDES } from '@/api/trip-detail-tab.types';
import {
  mergeCollabOverview,
  mergeTimelineOverview,
} from '@/lib/trip-detail-tab-merge.util';
import type { CollabOverviewResponse } from '@/types/collab-overview';
import type { TimelineOverviewResponse } from '@/types/timeline-overview';

describe('trip-detail-tab BFF v1.7', () => {
  it('defines include presets aligned with backend', () => {
    expect(TRIP_DETAIL_TAB_BFF_INCLUDES.timelineShell).toBe('stats');
    expect(TRIP_DETAIL_TAB_BFF_INCLUDES.timelinePhase2).toBe(
      'stats,pipeline,tasks,reminders,planobjects',
    );
    expect(TRIP_DETAIL_TAB_BFF_INCLUDES.timelineWithSuggestions).toContain('suggestions');
    expect(TRIP_DETAIL_TAB_BFF_INCLUDES.collabShell).toBe('members,health');
  });

  it('mergeTimelineOverview keeps shell stats until phase2 overwrites', () => {
    const shell: TimelineOverviewResponse = {
      tripId: 't1',
      stats: {
        feasibilityScore: 80,
        paceScore: 70,
        conflictCount: 1,
        pendingConfirmationCount: 0,
        newSuggestionCount: 3,
      },
      planning: { progressPercent: 0, completedStages: 0, totalStages: 5, stages: [] },
      tasks: [],
      incompleteTaskCount: 0,
      todayReminders: [],
      generatedAt: '2026-01-01T00:00:00Z',
    };
    const phase2: TimelineOverviewResponse = {
      ...shell,
      stats: { ...shell.stats, feasibilityScore: 88 },
      tasks: [{ id: 'task1', text: 'Book hotel', completed: false }],
      incompleteTaskCount: 1,
      planning: { ...shell.planning, progressPercent: 40, completedStages: 2 },
    };
    const merged = mergeTimelineOverview(shell, phase2);
    expect(merged.stats.newSuggestionCount).toBe(3);
    expect(merged.stats.feasibilityScore).toBe(88);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.planning.progressPercent).toBe(40);
  });

  it('mergeTimelineOverview preserves planObjects from phase2', () => {
    const shell: TimelineOverviewResponse = {
      tripId: 't1',
      stats: {
        feasibilityScore: 80,
        paceScore: 70,
        conflictCount: 1,
        pendingConfirmationCount: 0,
        newSuggestionCount: 0,
      },
      planning: { progressPercent: 0, completedStages: 0, totalStages: 5, stages: [] },
      tasks: [],
      incompleteTaskCount: 0,
      todayReminders: [],
      generatedAt: '2026-01-01T00:00:00Z',
    };
    const phase2: TimelineOverviewResponse = {
      ...shell,
      planObjects: {
        topAssessment: { headline: '2 处对象冲突', status: 'warning', issueCount: 2 },
        days: [{ dayNumber: 1, objects: [{ id: 'po1', kind: 'STAY', label: '酒店' }] }],
      },
    };
    const merged = mergeTimelineOverview(shell, phase2);
    expect(merged.planObjects?.topAssessment?.headline).toBe('2 处对象冲突');
    expect(merged.planObjects?.days).toHaveLength(1);
  });

  it('mergeTimelineOverview normalizes planObjects type → kind', () => {
    const shell: TimelineOverviewResponse = {
      tripId: 't1',
      stats: {
        feasibilityScore: 80,
        paceScore: 70,
        conflictCount: 0,
        pendingConfirmationCount: 0,
        newSuggestionCount: 0,
      },
      planning: { progressPercent: 0, completedStages: 0, totalStages: 5, stages: [] },
      tasks: [],
      incompleteTaskCount: 0,
      todayReminders: [],
      generatedAt: '2026-01-01T00:00:00Z',
    };
    const phase2: TimelineOverviewResponse = {
      ...shell,
      planObjects: {
        days: [
          {
            dayNumber: 2,
            objects: [{ id: 'po2', type: 'TRANSFER', name: 'Drive' } as unknown as import('@/types/plan-objects').PlanObjectDto],
          },
        ],
      },
    };
    const merged = mergeTimelineOverview(shell, phase2);
    expect(merged.planObjects?.days?.[0]?.objects[0]?.kind).toBe('TRANSFER');
    expect(merged.planObjects?.days?.[0]?.objects[0]?.label).toBe('Drive');
  });

  it('mergeCollabOverview fills collaborative tasks from phase2', () => {
    const shell: CollabOverviewResponse = {
      tripId: 't1',
      memberCount: 2,
      collaborators: [{ id: 'c1', userId: 'u1', role: 'OWNER' }],
      teamHealth: {
        progressPercent: 10,
        discussionCount: 0,
        highFrictionCount: 0,
        status: 'healthy',
      },
      collaborativeTasks: [],
      collaborativeTaskCount: 0,
      openSilentVoteCount: 0,
      silentVotes: [],
      generatedAt: '2026-01-01T00:00:00Z',
    };
    const phase2: CollabOverviewResponse = {
      ...shell,
      collaborativeTasks: [{ id: 'ct1', title: 'Vote', status: 'pending' }],
      collaborativeTaskCount: 1,
      teamHealth: { ...shell.teamHealth, progressPercent: 55 },
    };
    const merged = mergeCollabOverview(shell, phase2);
    expect(merged.collaborativeTasks).toHaveLength(1);
    expect(merged.teamHealth.progressPercent).toBe(55);
    expect(merged.collaborators).toHaveLength(1);
  });
});
