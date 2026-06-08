export type TaskRoleDispatchRule = {
  templateId: string;
  triggerMilestoneId?: string;
  triggerToolchainId?: string;
  minNoisePercent?: number;
  requiresRoleAnchor?: string;
  preferCaptain?: boolean;
  preferMbti?: string[];
  preferHighControl?: boolean;
  preferSlotIndex?: number;
  preferCoPlanning?: boolean;
};

/** §3.13 · MBTI / control / slot → assignee */
export const TASK_ROLE_DISPATCH_MATRIX: TaskRoleDispatchRule[] = [
  {
    templateId: 'satellite_dem_offline_verify',
    triggerMilestoneId: 'dem_blind_nav',
    preferCaptain: true,
    preferMbti: ['INTJ', 'ENTJ', 'ISTJ'],
    preferHighControl: true,
  },
  {
    templateId: 'ford_gear_shared_checklist',
    triggerMilestoneId: 'glacier_river_ford',
    preferMbti: ['ISTP', 'ESTP'],
    preferSlotIndex: 1,
  },
  {
    templateId: 'pre_trip_safety_blueprint',
    minNoisePercent: 15,
    requiresRoleAnchor: 'blind_box_follower',
  },
  {
    templateId: 'shared_gear_ledger',
    triggerToolchainId: 'shared_gear_checklist',
    preferCoPlanning: true,
  },
];

export const SCENE_ROLE_LABELS: Record<string, string> = {
  blind_box_follower: '🧩 盲盒跟从者',
  gear_rescue_lead: '🛠 装备救援位',
  co_navigator: '🧭 协同导航',
  silent_executor: '🔇 静默执行',
};
