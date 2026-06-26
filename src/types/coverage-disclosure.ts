/** L4 数据边界声明 — explain.coverage_disclosure / readiness score 同形 */

export interface CoverageDisclosure {
  /** 主文案，如「基于 road.is + 天气预报，未检查预订可退改」 */
  message?: string;
  /** 已纳入检查的数据源 */
  checkedSources?: string[];
  /** 未检查的能力维度，如 BOOKABILITY */
  uncheckedDimensions?: string[];
  /** 数据新鲜度说明 */
  dataFreshnessNote?: string;
  analyzedAt?: string;
}
