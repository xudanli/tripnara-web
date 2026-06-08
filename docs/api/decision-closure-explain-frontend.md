# 前端：决策闭环 explain 接入指南

`POST /api/agent/route_and_run`（或 `/api/agent/route-and-run`）响应里已投影 P0 字段。本仓库实现见下文路径索引。

## 接入档位

| 档位 | 工作量 | 本仓库 |
|------|--------|--------|
| **L0 零改** | 0 | 只展示 `result.answer_text` |
| **L1 推荐 P0** | 小 | `WorldConstraintBanner` + `OptimizationExplainBlock`（`tier="L1"`） |
| **L2 决策面板** | 中 | `tier="L2"` 弃选表 + `explain.optimization.alternatives` → `CandidatesPanel` |

默认：**L1**（`AgentChat` 非 debug）；debug 开 L2 表格。

## 响应路径（snake_case）

```text
RouteAndRunResponse
├── result.answer_text
└── explain.optimization
    ├── method
    ├── recommended_alternative_id
    ├── decision_verdict
    ├── decision_verdict_narration_zh
    ├── world_constraint_materialization   # applied_events: number
    ├── meta_decision_audit
    └── alternatives[]
```

## TypeScript 类型

权威定义：`src/types/world-model-guards.ts`（`RouteRunExplainOptimization` / 别名 `OptimizationExplain`）。

读取：

```typescript
import { pickOptimizationExplain } from '@/lib/world-model-guards';
// 或 pickRouteRunExplainOptimizationForMessage(res, { uiSurface, status: 'OK' })
```

## L1 UI 结构（已实现）

```text
┌ 路政 Banner（shouldShowRoadBanner）┐
├ 主回答 answer_text                  ┤
├ 「优化决策说明」折叠 Markdown        ┤  ← decision_verdict_narration_zh
│   可选：MC 一行、meta_decision_audit │
└ 规划壳：timeline / Candidates…      ┘
```

路政 Banner 条件见 `shouldShowRoadBanner`（`src/lib/route-run-optimization-explain.ts`）：`applied_events === 0` 不展示；需 `road_ids` 或 `weather_dates` 非空。

## 联调

1. 带 `trip_id` 走完整 SM（PLAN_GEN → OPTIMIZE → NARRATE），**重新打一轮**，勿只读 DEDUP 缓存。
2. dev 路政：`DECISION_OS_RAG_EVIDENCE_ENABLED=true` 或 `KERNEL_CGUS_RAG_EVIDENCE=true`。
3. 断言：`explain.optimization.method === 'CGUS'`、`decision_verdict_narration_zh` 非空。

## 常见坑

| 现象 | 处理 |
|------|------|
| 仅 answer_text | L0；或未走 OPTIMIZE |
| 判决书重复 | 折叠区用 `decision_verdict_narration_zh`，勿与全文 answer 重复展开 |
| camelCase 读不到 | 仅 snake_case |

## 代码索引

| 能力 | 路径 |
|------|------|
| 类型 | `src/types/world-model-guards.ts` |
| 解析 | `src/lib/world-model-guards.ts` → `pickExplainOptimizationFromRouteRun` |
| Banner / 文案 | `src/lib/route-run-optimization-explain.ts` |
| L1/L2 UI | `src/components/agent/OptimizationExplainBlock.tsx` |
| 路政 Banner | `src/components/planning/WorldConstraintBanner.tsx` |
| 挂载 | `src/components/agent/AgentChat.tsx` |
| 工作台 | `src/pages/plan-studio/index.tsx` |
| 智能体栏拖拽宽度 | `AssistantResizableWorkspace`（300–800px，`agent-sidebar-width`） |

相关：[route-and-run-ui-integration.md](./route-and-run-ui-integration.md) §6（对话上下文）· §9（optimization）
