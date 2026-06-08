import type { ReadinessCheckResult } from '@/api/readiness';

/**
 * 从 GET /readiness/trip/:id 返回的聚合 findings 树统计各级条数。
 * 与抽屉清单渲染数据源一致（区别于 GET .../score 的扁平 summary）。
 */
export function countNestedFindingItems(result: ReadinessCheckResult | null | undefined) {
  if (!result?.findings?.length) {
    return { blockers: 0, must: 0, should: 0, optional: 0 };
  }
  return result.findings.reduce(
    (acc, f) => ({
      blockers: acc.blockers + (f.blockers?.length ?? 0),
      must: acc.must + (f.must?.length ?? 0),
      should: acc.should + (f.should?.length ?? 0),
      optional: acc.optional + (f.optional?.length ?? 0),
    }),
    { blockers: 0, must: 0, should: 0, optional: 0 }
  );
}
