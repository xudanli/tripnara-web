import type { TrekkingRecruitmentScriptId, TrekkingSharedGearDeficit, TrekkingEventStreamMilestone, TrekkingToolchainItem, TrekkingWorldModel, TrekkingDnaEvolution } from '@/types/trekking-vibe-orchestration';

type TrekkingScriptWorldBinding = {
  worldModel: TrekkingWorldModel;
  sharedGearDeficits?: TrekkingSharedGearDeficit[];
  eventStreamMilestones?: TrekkingEventStreamMilestone[];
  toolchain?: TrekkingToolchainItem[];
  dnaEvolution?: TrekkingDnaEvolution;
};

/** 三剧本 → World Model / DNA / 工具链绑定（§3） */
export const TREKKING_SCRIPT_WORLD_BINDINGS: Record<
  TrekkingRecruitmentScriptId,
  TrekkingScriptWorldBinding
> = {
  chuanxi_heavy_trek: {
    worldModel: {
      profile: 'heavy_offline_dem',
      offlineDataPreloadRequired: true,
      demGridMetres: 12.5,
      routeDirectionCandidates: [
        {
          routeDirectionKey: 'IS_TREKKING_WILDERNESS',
          label: '冰岛 Laugavegur 高地重装',
          availability: 'live',
          routeDirectionId: 106,
        },
        {
          routeDirectionKey: 'CHUANXI_HEAVY_LOOP',
          label: '川西长坪沟穿毕棚沟 / 贡嘎大环',
          availability: 'planned',
        },
      ],
    },
    sharedGearDeficits: [
      { item: '卫星电话', reason: '高海拔无信号区应急联络' },
      { item: '四季帐', reason: '暴风雪与失温场景冗余' },
      { item: 'LNT 绳索套件', reason: '无痕山林与物理救援分工' },
    ],
    dnaEvolution: {
      ambiguityToleranceHint: 'minimize',
      filterPersonalityTags: ['flaky', '掉链子', '矫情'],
      preferenceEvolutionReasons: ['TREK_VIBE_CONFIRMED', 'TREK_READINESS_ACK'],
    },
  },
  light_trek_dyl_retreat: {
    worldModel: {
      profile: 'light_dyl_retreat',
      offlineDataPreloadRequired: false,
      excludedConstraints: ['light_pack_mule', 'slow_pace'],
      routeDirectionCandidates: [
        {
          routeDirectionKey: 'YUBENG_LIGHT',
          label: '雨崩 · 轻装隐居',
          availability: 'planned',
        },
        {
          routeDirectionKey: 'WUSUN_LIGHT',
          label: '乌孙古道 · 马帮驼装备',
          availability: 'planned',
        },
      ],
    },
    eventStreamMilestones: [
      {
        id: 'starry_dyl_canvas',
        label: '星空 DYL 画布局',
        trigger: 'clear_night_at_camp',
      },
    ],
    toolchain: [
      { id: 'dyl_canvas_electronic', label: 'DYL Canvas 电子版' },
      { id: 'mbti_complement_lens', label: 'MBTI 互补透镜' },
    ],
    dnaEvolution: {
      ambiguityToleranceHint: 'neutral',
      filterPersonalityTags: ['爹味', '说教', '无效职场八卦'],
      preferenceEvolutionReasons: ['TREK_VIBE_CONFIRMED'],
    },
  },
  weekend_fast_light_trek: {
    worldModel: {
      profile: 'weekend_fast_light',
      offlineDataPreloadRequired: false,
      physicalConstraints: ['single_day_burst', 'no_hotel_ledger'],
      routeDirectionCandidates: [
        {
          routeDirectionKey: 'ZHEXI_SANJIAN',
          label: '浙西三尖 · 百公里越野',
          availability: 'planned',
        },
        {
          routeDirectionKey: 'HANGZHOU_FAST_ASCENT',
          label: '法喜寺-十里琅珰速攀',
          availability: 'planned',
        },
      ],
    },
    toolchain: [
      { id: 'hourly_weather_pace', label: '小时级气象配速' },
      { id: 'basecamp_craft_beer_poi', label: '终点精酿 POI' },
    ],
    dnaEvolution: {
      silentFlow: true,
      filterPersonalityTags: ['无效社交', '大厂八卦'],
      preferenceEvolutionReasons: ['TREK_POST_RATING_FIVE_STAR'],
    },
  },
};
