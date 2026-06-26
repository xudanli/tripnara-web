/**
 * Narrative Engine V1 前端 Feature Flag
 * 与后端 NARRATIVE_THEME_V1=true 对齐
 */
export function isNarrativeThemeV1Enabled(): boolean {
  return import.meta.env.VITE_FEATURE_NARRATIVE_THEME_V1 === '1';
}
