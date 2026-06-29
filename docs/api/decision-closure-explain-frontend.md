# 前端：决策闭环 explain 接入（本仓实现索引）

后端 `POST /api/agent/route_and_run` 响应投影 `explain.optimization`。完整接入说明见 [frontend-decision-closure-integration.md](../frontend-decision-closure-integration.md)。

## 已实现

| 能力 | 路径 |
|------|------|
| 类型 | `src/types/world-model-guards.ts`（`OptimizationExplain`） |
| 解析 | `src/lib/world-model-guards.ts` → `pickOptimizationExplain` |
| SSOT 逻辑 | `src/lib/decision-closure-l1.ts` |
| Panel + 子组件 | `src/components/decision-closure/` |
| 挂载 | `src/components/agent/AgentChat.tsx` |
| 工作台 Panel | `src/pages/plan-studio/index.tsx`（完整 L1 + 折叠 L2 表） |
| Mock | `fixtures/agent/route-and-run-decision-closure-l1.mock.json` |
| 单测 | `npm run test:decision-closure-l1` |

## 响应字段（snake_case）

```text
explain.optimization
├── method
├── recommended_alternative_id
├── decision_verdict_narration_zh
├── world_constraint_materialization   # applied_events: number
├── meta_decision_audit
├── decision_verdict.rejected_plans
└── alternatives[]
```

## 常见坑

| 现象 | 处理 |
|------|------|
| 仅 answer_text | L0；或未走 OPTIMIZE |
| camelCase 读不到 | 用 `applied_events` 等 |
| 判决书重复 | 卡片用 `decision_verdict_narration_zh` |
| 无路政 Banner | 开 RAG env；`applied_events === 0` 不展示 |
