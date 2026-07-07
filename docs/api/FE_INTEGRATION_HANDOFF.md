# Plan Studio · Decision 联调 Handoff

**日期：** 2026-07-02  
**范围：** Unified Decision Gateway · 决策空间 · Decision Center

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [unified-decision-frontend-handoff.md](./unified-decision-frontend-handoff.md) | 环境、Fixture、curl、Canonical L2 写路径 |
| [unified-decision-frontend-integration.md](./unified-decision-frontend-integration.md) | API 路由与 Gateway 读模型 |
| [decision-options-tradeoffs-contract.md](./decision-options-tradeoffs-contract.md) | 方案卡 `options[].tradeoffs[]` · 前后端 SSOT |
| [decision-execution-space-handoff.md](./decision-execution-space-handoff.md) | 决策执行空间 · 队列合并 · 写回环 · BFF 契约 |

---

## 前端入口

| 模块 | 路径 |
|------|------|
| 决策空间 | `src/components/plan-studio/workbench/PlanningWorkbenchDecisionSpace.tsx` |
| 方案卡 | `src/components/plan-studio/workbench/DecisionSpaceOptionCard.tsx` |
| options → 视图 | `src/lib/decision-space-option-view.util.ts` |
| Gateway 开关 | `VITE_DECISION_GATEWAY_UNIFIED=1` |

---

## 后端入口（NestJS repo）

| 模块 | 路径 |
|------|------|
| Decision Space 投影 | `src/trips/decision-semantics/projections/decision-space-option-projection.util.ts` |
| Legacy options | `DecisionSemanticsService.buildOptionsFromIssue` |
| Canonical options | `bridgeCandidatesToOptions` |
| 投影单测 | `decision-space-option-projection.util.spec.ts` |

---

## 快速验收

```bash
# 本仓
npm run decision-center:unified-qa -- 3e4a1058-9218-467f-988a-c18008a14385

# 方案卡 tradeoffs
TRIP=3e4a1058-9218-467f-988a-c18008a14385
PROB=dp_id:coverage-gap:1
curl -s "http://${BACKEND_HOST:-127.0.0.1}:3000/api/trips/$TRIP/decision-problems/$PROB/options" \
  | jq '.data.options[] | {id, title, route: .routePreview.placeNames, tradeoffs: .tradeoffs | length}'
```

**P0：** 每个 option ≥2 条带 `value+unit` 的 tradeoff；驾驶类含 `TIME.explanation`；改线类含 `routePreview.placeNames`。详见 [decision-options-tradeoffs-contract.md §3](./decision-options-tradeoffs-contract.md#3-验收-curl)。
