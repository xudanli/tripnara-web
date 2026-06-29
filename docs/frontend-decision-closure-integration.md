# 前端：决策闭环 explain 接入指南

`POST /api/agent/route_and_run` 响应已投影 P0 字段。本仓**已实现**完整 Panel；下文说明挂载方式与路径对照。

## 一句话

> 在 route_and_run 结果页挂载 **`DecisionClosureL1Panel`**：从 `explain.optimization` 读结构化字段（**snake_case**）。Mock：`fixtures/agent/route-and-run-decision-closure-l1.mock.json`。显示逻辑对齐后端 SSOT `decision-closure-l1.util.ts`。联调路政 Banner 需 `DECISION_OS_RAG_EVIDENCE_ENABLED=true`。

## 接入档位

| 档位 | 本仓做法 |
|------|----------|
| **L0** | 只展示 `result.answer_text`（无 Panel） |
| **L1** | Banner + 判决书折叠卡 |
| **L2** | L1 + `<details>` 弃选表 + 方案得分对比（默认折叠；debug 开 `detailsDefaultOpen`） |

## 挂载（已实现）

### 规划助手气泡（`AgentChat`）

```tsx
import { pickOptimizationExplain } from '@/lib/world-model-guards';
import { DecisionClosureL1Panel } from '@/components/decision-closure';

const optimization = pickOptimizationExplain(response);

// Banner 在 answer 上方
<DecisionClosureL1Panel optimization={optimization} part="banner" />

{/* answer_text 主气泡 */}

// 判决书 + 两表在 answer 下方
<DecisionClosureL1Panel optimization={optimization} part="verdict" />
```

无 `explain.optimization` → 各 part 返回 `null`（L0 降级）。

### 规划工作台（`plan-studio/index.tsx`）

约束区下方整段 Panel（Banner + 判决书 + 两表，无中间 answer 气泡）：

```tsx
<DecisionClosureL1Panel
  optimization={explainOptimization}
  detailsDefaultOpen={showDecisionCockpitDeepLink}
/>
```

数据来自 `useWorldModelGuardsStore` → `explainOptimization`（route_and_run OK 后写入）。

## 组件索引（通用包 → 本仓）

| 通用包 | 本仓 |
|--------|------|
| `types/route-and-run-optimization.ts` | `src/types/world-model-guards.ts` |
| `utils/decision-closure-l1.ts` | `src/lib/decision-closure-l1.ts` |
| `RoadConstraintBanner` | `src/components/decision-closure/RoadConstraintBanner.tsx`（→ `WorldConstraintBanner`） |
| `DecisionVerdictCard` | `src/components/decision-closure/DecisionVerdictCard.tsx` |
| `RejectedPlansTable` | `src/components/decision-closure/RejectedPlansTable.tsx` |
| `AlternativesComparisonTable` | `src/components/decision-closure/AlternativesComparisonTable.tsx` |
| `DecisionClosureL1Panel` | `src/components/decision-closure/DecisionClosureL1Panel.tsx` |

Barrel：`import { … } from '@/components/decision-closure'`

## UI 结构

```text
┌ 路政 Banner（shouldShowRoadBanner）┐
├ 主回答 answer_text                  ┤
├ 「优化决策说明」折叠 Markdown        ┤
├ ▸ 弃选方案（N）                     ┤  ← details 默认折叠
└ ▸ 方案得分对比（N）★ 高亮推荐行      ┘
```

## 验证

```bash
npm run test:decision-closure-l1
```

## 联调

- staging/dev：`DECISION_OS_RAG_EVIDENCE_ENABLED=true`
- 走完整 OPTIMIZE 闭环；DEDUP 缓存可能无 `explain.optimization`
- 字段一律 **snake_case**

## PR 自检

- [ ] 只读 snake_case
- [ ] 无 optimization 时不报错（L0）
- [ ] Banner 用 `shouldShowRoadBanner`
- [ ] 判决书 Markdown，勿与 `answer_text` 重复全文
- [ ] 弃选/对比表默认 `<details>` 折叠
- [ ] `resolveChosenAlternativeId` 高亮推荐行

详细 API 说明：[docs/api/decision-closure-explain-frontend.md](./api/decision-closure-explain-frontend.md)
