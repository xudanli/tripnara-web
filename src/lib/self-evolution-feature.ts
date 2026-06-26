/** Round 3 · 自进化架构 Feature Flag */
export function isSelfEvolutionEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_SELF_EVOLUTION !== '0';
}
