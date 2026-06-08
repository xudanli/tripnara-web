/** §3.13 · Decision Engine & Task Flywheel */

export type SceneRoleAnchor =
  | 'blind_box_follower'
  | 'gear_rescue_lead'
  | 'co_navigator'
  | 'silent_executor'
  | (string & {});

export type PreMatchNoiseDriver = {
  milestoneId?: string;
  label: string;
  factor: string;
};

/** 队长审批专用 decisionBrief — 不替代 Hard Gate */
export type PreMatchDecisionBrief = {
  hardMetricsPass: boolean;
  inTripCollaborationNoisePercent: number;
  noiseDrivers: PreMatchNoiseDriver[];
  suggestedSceneRoleAnchor?: SceneRoleAnchor | null;
  suggestedSceneRoleLabel?: string | null;
  mitigatingTaskTemplateIds: string[];
  narrativeLine: string;
};

export type CollaborativeTaskStatus = 'pending' | 'confirmed' | 'rolled_back' | 'timed_out';

export type CollaborativeTaskBehaviorLogEntry = {
  action: CollaborativeTaskEventAction;
  at: string;
  actorUserId?: string;
};

export type CollaborativeTaskView = {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  assigneeUserId?: string | null;
  assigneeLabel?: string | null;
  status: CollaborativeTaskStatus;
  milestoneId?: string | null;
  behaviorLog?: CollaborativeTaskBehaviorLogEntry[];
};

export type CollaborativeTaskFlywheelMetadata = {
  version: 'collaborative_task_flywheel_v1';
  recruitmentPostId: string;
  tasks: CollaborativeTaskView[];
  dispatchedAt: string;
};

export type CollaborativeTaskEventAction = 'confirm' | 'rollback' | 'ack_timeout';

export type CollaborativeTaskEventRequest = {
  action: CollaborativeTaskEventAction;
  note?: string;
  evidenceRefs?: string[];
};

/** GET /trips/:tripId/collaborative-tasks */
export type CollaborativeTasksResponse = {
  tripId: string;
  flywheel: CollaborativeTaskFlywheelMetadata | null;
  tasks: CollaborativeTaskView[];
};
