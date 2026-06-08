import type { TrekkingRecruitmentScriptId } from '@/types/trekking-vibe-orchestration';
import type { RouteTemplateVaultMilestone } from '@/types/route-template-intent';

export type { RouteTemplateVaultMilestone };

export type RouteTemplateCatalogEntry = {
  catalogId: string;
  titleZh: string;
  scriptId: TrekkingRecruitmentScriptId | 'mountain_dyl_retreat';
  routeDirectionKey: string;
  routeDirectionName: string;
  durationDays: number;
  /** 关键词打分 — 愿景 / chips 命中加分 */
  intentKeywords: string[];
  budgetMinRmb?: number;
  budgetMaxRmb?: number;
  /** §3.11 Phase 3 · Route Contract Lock × Trip Vault */
  routeContractLockEnabled?: boolean;
  vaultMilestones?: RouteTemplateVaultMilestone[];
  slotAugmentations?: Array<{
    slotRole: string;
    expectedTagSuffix: string;
    reason: string;
  }>;
};

/** §3.11 Phase 1 catalog — 新增场景只改 config */
export const ROUTE_TEMPLATE_CATALOG: RouteTemplateCatalogEntry[] = [
  {
    catalogId: 'is_laugavegur_55km_heavy_4d',
    titleZh: '冰岛内陆兰格维格 55km 硬核重装 4日',
    scriptId: 'chuanxi_heavy_trek',
    routeDirectionKey: 'IS_LAUGAVEGUR',
    routeDirectionName: 'IS_LAUGAVEGUR',
    durationDays: 4,
    budgetMinRmb: 8000,
    budgetMaxRmb: 15000,
    intentKeywords: [
      '冰岛',
      'Iceland',
      'Laugavegur',
      '兰格维格',
      'Landmannalaugar',
      '内陆高地',
      '重装',
      'DEM',
      '涉水',
    ],
    routeContractLockEnabled: true,
    vaultMilestones: [
      {
        id: 'vault_is_d1_highland_hut',
        day: 1,
        label: 'D1 · 高地 hut 预订单',
        lockAmountCents: 85000,
        currency: 'ISK',
      },
      {
        id: 'vault_is_d2_landmannalaugar',
        day: 2,
        label: 'D2 · Landmannalaugar 火山营地',
        lockAmountCents: 120000,
        currency: 'ISK',
      },
      {
        id: 'vault_is_d3_ford_checkpoint',
        day: 3,
        label: 'D3 · Fjórðungakvísl 涉水窗口保障',
        lockAmountCents: 45000,
        currency: 'ISK',
      },
    ],
    slotAugmentations: [
      {
        slotRole: 'gear_rescue',
        expectedTagSuffix: '涉水/高寒物理救援',
        reason: '兰格维格模板含多处冰川融水强涉水，需硬核物理输出补位',
      },
    ],
  },
  {
    catalogId: 'chuanxi_heavy_loop_planned',
    titleZh: '川西长坪沟穿毕棚沟 / 贡嘎大环 重装',
    scriptId: 'chuanxi_heavy_trek',
    routeDirectionKey: 'CHUANXI_HEAVY_LOOP',
    routeDirectionName: 'CHUANXI_HEAVY_LOOP',
    durationDays: 5,
    budgetMinRmb: 2000,
    budgetMaxRmb: 5000,
    intentKeywords: ['川西', '长坪沟', '毕棚沟', '贡嘎', '重装', '自负重', 'DEM', 'LNT'],
    routeContractLockEnabled: true,
    vaultMilestones: [
      {
        id: 'vault_cx_d2_camp',
        day: 2,
        label: 'D2 · 高海拔营地扎营保障',
        lockAmountCents: 68000,
      },
      {
        id: 'vault_cx_d4_pass',
        day: 4,
        label: 'D4 · 垭口通行窗口',
        lockAmountCents: 42000,
      },
    ],
    slotAugmentations: [
      {
        slotRole: 'gear_rescue',
        expectedTagSuffix: '高海拔物理救援',
        reason: '川西重装环线需卫星电话与四季帐冗余分工',
      },
    ],
  },
  {
    catalogId: 'anji_dna_light_camp_3d',
    titleZh: '安吉 DNA 社区 · 山谷露营 DYL 3日',
    scriptId: 'light_trek_dyl_retreat',
    routeDirectionKey: 'ANJI_DNA_RETREAT',
    routeDirectionName: 'ANJI_DNA_RETREAT',
    durationDays: 3,
    budgetMinRmb: 1500,
    budgetMaxRmb: 3500,
    intentKeywords: ['安吉', 'DNA', 'DYL', '设计人生', '露营', '山谷', 'Stanford', '复盘'],
    routeContractLockEnabled: true,
    vaultMilestones: [
      {
        id: 'vault_anji_d2_camp',
        day: 2,
        label: 'D2 · 山谷露营位',
        lockAmountCents: 120000,
      },
    ],
    slotAugmentations: [
      {
        slotRole: 'facilitation',
        expectedTagSuffix: '高倾听带宽 · 无爹味',
        reason: 'DYL 局需互补 MBTI 与深度倾听，拒绝职场撕逼',
      },
    ],
  },
  {
    catalogId: 'yubeng_light_dyl_4d',
    titleZh: '雨崩 · 轻装 DYL 人生设计局 4日',
    scriptId: 'light_trek_dyl_retreat',
    routeDirectionKey: 'YUBENG_LIGHT',
    routeDirectionName: 'YUBENG_LIGHT',
    durationDays: 4,
    budgetMinRmb: 2000,
    budgetMaxRmb: 4500,
    intentKeywords: ['雨崩', '天堂湖', '马帮', '轻装', 'DYL', '班味', '疗愈'],
  },
  {
    catalogId: 'zhexi_fast_light_1d',
    titleZh: '浙西三尖 / 十里琅珰 速攀 1日',
    scriptId: 'weekend_fast_light_trek',
    routeDirectionKey: 'ZHEXI_FAST',
    routeDirectionName: 'ZHEXI_FAST',
    durationDays: 1,
    budgetMinRmb: 200,
    budgetMaxRmb: 500,
    intentKeywords: ['速攀', '三尖', '十里琅珰', '法喜寺', 'Fast', 'Light', '心率', '精酿'],
  },
];
