import { describe, expect, it } from 'vitest';
import {
  buildSuggestedSubTasks,
  decisionCollaborativeSubTaskKindLabel,
  labelForCollaborativeSubTaskStatus,
  normalizeCollaborativeSubTaskStatus,
  normalizeCreateDecisionCollaborativeSubTaskResponse,
  normalizeDecisionCollaborativeSubTask,
  normalizeListDecisionCollaborativeSubTasksResponse,
  normalizePatchDecisionCollaborativeSubTaskResponse,
  previewCollaborativeFollowUps,
  resolveAutoSuggestedSubTaskKinds,
} from './decision-collaborative-sub-task.util';
import { DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID } from '@/types/unified-decision';

describe('decision-collaborative-sub-task.util', () => {
  it('normalizes sub-task view with contract status', () => {
    const item = normalizeDecisionCollaborativeSubTask({
      id: 'st_1',
      resolutionId: 'res_p1_abc',
      title: '查酒店取消政策',
      kind: 'CANCELLATION_POLICY',
      status: 'pending',
    });
    expect(item?.kind).toBe('CANCELLATION_POLICY');
    expect(item?.status).toBe('pending');
  });

  it('maps legacy status aliases to contract values', () => {
    expect(normalizeCollaborativeSubTaskStatus('OPEN')).toBe('pending');
    expect(normalizeCollaborativeSubTaskStatus('IN_PROGRESS')).toBe('in_progress');
    expect(normalizeCollaborativeSubTaskStatus('DONE')).toBe('completed');
    expect(labelForCollaborativeSubTaskStatus('in_progress')).toBe('进行中');
  });

  it('normalizes list response', () => {
    const list = normalizeListDecisionCollaborativeSubTasksResponse({
      items: [{ id: 'st_1', resolutionId: 'res_1', title: '团队确认', kind: 'TEAM_CONFIRM' }],
    });
    expect(list.items).toHaveLength(1);
  });

  it('normalizes create response', () => {
    const created = normalizeCreateDecisionCollaborativeSubTaskResponse({
      subTask: {
        id: 'st_2',
        resolutionId: 'res_1',
        title: '查住宿',
        kind: 'ACCOMMODATION_LOOKUP',
      },
    });
    expect(created.subTask.title).toBe('查住宿');
  });

  it('maps kind labels', () => {
    expect(decisionCollaborativeSubTaskKindLabel('CANCELLATION_POLICY')).toBe('取消政策');
  });

  it('normalizes patch response schema', () => {
    const patched = normalizePatchDecisionCollaborativeSubTaskResponse({
      schemaId: DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID,
      subTask: {
        id: 'st_3',
        resolutionId: 'res_1',
        title: '查酒店取消政策',
        kind: 'CANCELLATION_POLICY',
        status: 'in_progress',
      },
    });
    expect(patched.schemaId).toBe(DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID);
    expect(patched.subTask.status).toBe('in_progress');
  });

  it('resolves auto-suggested kinds by semanticKey', () => {
    expect(resolveAutoSuggestedSubTaskKinds('ROAD_SEGMENT_F208')).toEqual([
      'TEAM_CONFIRM',
      'BOOKING_FOLLOWUP',
    ]);
    expect(resolveAutoSuggestedSubTaskKinds('BOOKING_HOTEL_DAY3')).toEqual([
      'ACCOMMODATION_LOOKUP',
      'CANCELLATION_POLICY',
    ]);
    expect(resolveAutoSuggestedSubTaskKinds('OTHER')).toEqual(['TEAM_CONFIRM']);
  });

  it('previews collaborative follow-ups', () => {
    const preview = previewCollaborativeFollowUps('ROAD_SEGMENT_F208');
    expect(preview.items).toHaveLength(2);
    expect(preview.items[0]?.status).toBe('pending');
  });

  it('builds suggested sub-tasks for apply preview', () => {
    const suggested = buildSuggestedSubTasks('BOOKING_HOTEL_DAY3', {
      resolutionId: 'res_1',
    });
    expect(suggested).toHaveLength(2);
    expect(suggested[0]?.resolutionId).toBe('res_1');
    expect(suggested[0]?.status).toBe('pending');
  });
});
