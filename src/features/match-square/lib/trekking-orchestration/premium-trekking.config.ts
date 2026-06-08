import type { TrekkingSceneCategory } from '@/types/trekking-vibe-orchestration';

/** 场景 premium_trekking ↔ 侧边栏 🏃 徒步入口 */
export const PREMIUM_TREKKING_SCENE: TrekkingSceneCategory = 'premium_trekking';

export const PREMIUM_TREKKING_MENU_KEY = 'hiking' as const;

export const PREMIUM_TREKKING_VIBE_CHIP_IDS = {
  dem_digital_elevation: 'dem_digital_elevation',
  self_supported_camping: 'self_supported_camping',
  risk_self_managed: 'risk_self_managed',
  dyl_life_design: 'dyl_life_design',
  burnwash_full: 'burnwash_full',
  starry_bonfire: 'starry_bonfire',
  hr_max_out: 'hr_max_out',
  elite_silence: 'elite_silence',
  basecamp_craft_beer: 'basecamp_craft_beer',
} as const;

/** Vibe chip 中文 label → 规范 chip id（规则引擎兜底） */
export const VIBE_CHIP_LABEL_TO_ID: Record<string, string> = {
  '📡 DEM数字高程': PREMIUM_TREKKING_VIBE_CHIP_IDS.dem_digital_elevation,
  '⛺️ 自负重野营': PREMIUM_TREKKING_VIBE_CHIP_IDS.self_supported_camping,
  '🛡️ 风险自理': PREMIUM_TREKKING_VIBE_CHIP_IDS.risk_self_managed,
  '📐 DYL人生设计': PREMIUM_TREKKING_VIBE_CHIP_IDS.dyl_life_design,
  '🪵 雨崩轻装隐居': PREMIUM_TREKKING_VIBE_CHIP_IDS.burnwash_full,
  '🌌 星空围炉局': PREMIUM_TREKKING_VIBE_CHIP_IDS.starry_bonfire,
  '🏃 山野速攀': PREMIUM_TREKKING_VIBE_CHIP_IDS.hr_max_out,
  '🤐 高阶沉默': PREMIUM_TREKKING_VIBE_CHIP_IDS.elite_silence,
  '🍺 下山精酿': PREMIUM_TREKKING_VIBE_CHIP_IDS.basecamp_craft_beer,
};
