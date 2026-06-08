export type SceneTaskTemplate = {
  id: string;
  title: string;
  description: string;
  milestoneId?: string;
  toolchainId?: string;
};

/** §3.13 · 场景任务模板库 */
export const SCENE_TASK_TEMPLATES: Record<string, SceneTaskTemplate> = {
  satellite_dem_offline_verify: {
    id: 'satellite_dem_offline_verify',
    title: '卫星 DEM 离线验证',
    description: '成团前确认离线高程包与卫星链路冗余，覆盖内陆断网盲导段。',
    milestoneId: 'dem_blind_nav',
  },
  ford_gear_shared_checklist: {
    id: 'ford_gear_shared_checklist',
    title: '冰川融水涉水共检',
    description: 'Fjórðungakvísl 等强涉水点前，全队共享涉水与保暖装备清单。',
    milestoneId: 'glacier_river_ford',
  },
  pre_trip_safety_blueprint: {
    id: 'pre_trip_safety_blueprint',
    title: '行前安全蓝图交付',
    description: '向被锚定成员交付离线导航与安全预案，对冲行中焦虑与协作噪音。',
  },
  shared_gear_ledger: {
    id: 'shared_gear_ledger',
    title: '共享装备台账',
    description: '副手协同维护全队共享装备借还与缺口清单。',
    toolchainId: 'shared_gear_checklist',
  },
};

export const SYNTHETIC_MILESTONES = {
  dem_blind_nav: {
    id: 'dem_blind_nav',
    label: '内陆断网盲导',
    trigger: 'offline_dem_nav_gap',
  },
  glacier_river_ford: {
    id: 'glacier_river_ford',
    label: '冰川融水强涉水',
    trigger: 'high_flow_ford',
  },
} as const;
