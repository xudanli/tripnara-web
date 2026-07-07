# 执行阶段 · 强风因果链 Handoff

**日期：** 2026-07-07  
**协作：** 产品经理 · 视觉设计师 · 资深前端架构师  
**目标：** 将规划阶段「决策检查器 · 因果链 Tab」同款 Abu + 竖向 stepper，落到行中 Live 页面（执行决策检查器 · 概览）

---

## 1. 这是哪个接口？（产品 × 架构）

截图中的强风因果链**不是单一字段**，前端按优先级合并：

| 优先级 | 接口 | 路径 | 场景 |
|--------|------|------|------|
| **P0（规划 · 已上线）** | Gateway 决策问题详情 | `GET /api/trips/:tripId/decision-problems/:problemId` | 字段 `guardianCausalStoryView` + `causalStoryView.chain[]` |
| **P0（规划 · BFF）** | 决策因果链 | `GET /api/trips/:tripId/arrange-itinerary/decision-causal-chain?problemId=&optionId=` | Schema `tripnara.planning_causal_chain@v1` · `nodes[]` |
| **P1（规划 · Inspector）** | 决策 Inspector | `GET .../decision-inspector?...` 或 bundle delta `include=inspector.causalChain` | `inspector.causalChain` |
| **P2（Gateway 追溯）** | 因果追溯 | `GET /api/trips/:tripId/decision-problems/:problemId/causal-trace` | `CausalTraceReplayView` |
| **P0（行中 · 已上线）** | 行中执行守护 | `GET /api/trips/:tripId/in-trip/execution-advisory` | **`causalInsight`** 首包（见 §3） |
| **Tier-3（行中刷新）** | 因果追溯 | `GET /api/trips/:tripId/decision-problems/:linkedProblemId/causal-trace` | 首包无 `chain[]` 时懒加载 |

**结论：**

- 规划阶段：`guardianCausalStoryView` + `causalStoryView.chain` 或 `decision-causal-chain`。
- **行中阶段：优先读 `execution-advisory.causalInsight`（P0）**；若仅有 `guardianHeadline + linkedProblemId`，概览 Tab 懒拉 **causal-trace**。

---

## 2. 产品定义（PM）

### 2.1 用户故事

> 作为行中领队，当强风/延误触发预警时，我希望在执行页看到 **Abu 安全提示 + 因果推导链**（天气 → 通行 → 预约 → 决策冲突），以便理解「为什么要改 Plan B」，而不是只看一句 headline。

### 2.2 展示位置（与视觉稿对齐）

| 区域 | 内容 | 交互 |
|------|------|------|
| 顶栏 Alert Banner | 一句话结论 + 「查看详情与建议」 | 打开右侧执行决策检查器 · **概览** |
| 中栏底部「实时预警说明」 | 摘要 + 建议行动（保持） | 「查看详情」→ 同上 |
| **右栏 · 执行决策检查器 · 概览 Tab** | **Abu Banner + 因果链 stepper**（本需求核心） | 默认选中概览 |
| 右栏 · Plan B 列表 | 替代方案卡（已有） | 与因果链末步「最小干预建议」呼应 |

### 2.3 因果链节点语义（强风场景 SSOT）

| 顺序 | 标签 | 示例描述 | 来源字段 |
|------|------|----------|----------|
| 1 | 天气影响 | 预计出现 12 m/s 阵风… | `chain[].type=WEATHER` |
| 2 | 通行耗时 | P90 通行时间增加约 23 分钟 | `TRAVEL_TIME` / `ROUTE` |
| 3 | 预约风险 | 错过预约的概率约为 78% | `RESERVATION` / `BOOKING` |
| 4 | 决策冲突 | 路段详情 + 最小干预建议… | `assessment` 或末节点 `DECISION` |

**规则：**

- **交通缓冲**等指标只在「计划差异」表，**不进**因果链节点（与 plan-diff 契约一致）。
- Abu headline 单独一行，**不重复** assessment 全文（前端 `assessmentRedundantWithChainNodes` 已处理）。

### 2.4 验收标准

- [ ] 强风/AT_RISK 时，概览 Tab 展示 Abu + ≥3 步因果链
- [ ] 无因果数据时，概览显示空态，不阻塞 Plan B
- [ ] 与规划阶段 `DecisionSpaceCausalChainPanel` 复用同一 stepper 组件
- [ ] `execution-advisory` 返回 `causalInsight` 后，前端不再使用 demo fallback

---

## 3. 架构契约（Architect）

### 3.1 扩展 `TripExecutionAdvisoryDto`

```typescript
// src/types/trip-execution-advisory.ts

interface ExecutionCausalInsightDto {
  guardianHeadline: string;
  primaryEnforcement: 'ADJUST_REQUIRED' | 'NOT_EXECUTABLE';
  causalStory: {
    chain: Array<{ nodeId; type; title; description; sourceRefs? }>;
    assessment: string;
  };
  linkedProblemId?: string;
}
```

**primaryEnforcement 映射（前端 banner）：**

| BFF | Banner |
|-----|--------|
| `NOT_EXECUTABLE` | `BLOCK` |
| `ADJUST_REQUIRED` | `REQUIRE_ADJUSTMENT` |

**归一化：** `normalizeTripExecutionAdvisory()` · `src/lib/normalize-trip-execution-advisory.util.ts`

### 3.2 后端聚合建议

```
execution-advisory 生成流水线
  → 今日 active environment event (wind)
  → 关联 open decision problem / causal trace
  → 投影 guardianCausalStoryView（Abu）
  → 投影 causalStoryView.chain（stepper）
  → 写入 causalInsight
```

**降级：** 仅 `verdict.headline` + `realtimeRisks.weather` 时，前端用 deviations 拼 1–2 步；完整链仍依赖 BFF。

### 3.3 前端数据流

```
useTripExecutionAdvisory(tripId)
  → normalizeTripExecutionAdvisory()          // BFF 归一化
  → useExecuteCausalInsight(tripId, advisory)
       ├── resolveExecuteCausalInsight()       // P0 causalInsight
       └── GET causal-trace(linkedProblemId)   // Tier-3（无 chain 时）
  → ExecuteCausalInsightPanel
```

**Tier-3 触发：** `causalInsight.linkedProblemId` 存在且 `causalStory.chain` 为空。

**复用锚点：**

- `DecisionGuardianWarningBanner` · `CausalStoryFactorList` · `DecisionSpaceCausalChainPanel`（规划）
- Hook 参考：`useDecisionCausalChain`（若 `linkedProblemId` 存在）

---

## 4. 视觉规范（Designer）

与规划阶段因果链 Tab **同组件、紧凑密度**：

| 元素 | 规范 |
|------|------|
| Abu Banner | Layer A 中性面 `border-border/60 bg-card`；warning 仅 ⚡ 图标 |
| Stepper | 竖线 + 圆点；主文 11px；标签 10px muted |
| 间距 | 与方案差异/可执行性 Tab 一致：`space-y-2 p-2` |
| 概览 Tab 区域 | `flex-1 overflow-y-auto`，因果链在上、Plan B 卡片区在下 |

---

## 5. 前端落地清单

| 项 | 文件 | 状态 |
|----|------|------|
| 类型 SSOT | `src/types/trip-execution-advisory.ts` | ✅ |
| BFF 归一化 | `src/lib/normalize-trip-execution-advisory.util.ts` | ✅ |
| 解析 util | `src/lib/execute-causal-insight.util.ts` | ✅ |
| Tier-3 Hook | `src/hooks/useExecuteCausalInsight.ts` · causal-trace | ✅ |
| 行中面板 | `src/components/execute/live/ExecuteCausalInsightPanel.tsx` | ✅ |
| 接入侧栏 | `ExecuteDecisionSidebar.tsx` · 概览 Tab | ✅ |
| 后端契约 | `trip-constraint-solver-read-models-api.md` §5 | 待补 |

---

## 6. 相关文档

- [decision-space-bundle.md](./decision-space-bundle.md) · Tier-3 causal-chain
- [decision-inspector-plan-diff-contract.md](./decision-inspector-plan-diff-contract.md)
- [trip-constraint-solver-read-models-api.md](./trip-constraint-solver-read-models-api.md)
- [decision-execution-space-handoff.md](./decision-execution-space-handoff.md)
