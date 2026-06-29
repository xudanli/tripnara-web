# 预算 Tab · 前端对接指南

**版本**：与后端 2026-06 对齐  
**关联 PRD**：[`docs/prd/travel-budget-four-layer-prd.md`](../prd/travel-budget-four-layer-prd.md)

---

## 1. 主请求（P0 · 必接）

### `GET /api/trips/{tripId}/budget/profile?include=actuals,wallet,value`

预算 Tab **唯一主数据源**，一次拿齐 L1–L4 快照。

| 前端模块 | 使用字段 |
|---------|---------|
| 左栏概览 | `intent`, `actuals`, `wallet` |
| 分配概览 | `structure.allocations`, `actuals.categoryBreakdown` |
| 分摊预览 | `wallet.members`, `wallet.paymentRule` |
| Banner | `gateStatus`（或由 evaluate 覆盖） |

**实现**：`tripBudgetApi.getProfile` → `useWorkbenchBudgetProfile` / `useTripBudgetProfile`  
**404 fallback**：constraint + cost-summary + localStorage（待后端就绪后应消失）

---

## 2. 写接口（P0 · 替换 localStorage）

| 接口 | 用途 |
|------|------|
| `PUT /trips/{tripId}/budget/intent` | L1 总预算 |
| `PUT /trips/{tripId}/budget/structure` | L2 结构分配 |

成功后 **invalidate** `workbenchKeys.budgetProfile(tripId)`，不再仅写 localStorage。

---

## 3. Checker 评估（P0）

### `POST /api/planning-workbench/budget/evaluate`

```typescript
// 最简：服务端从 trip 读 intent/structure
{
  tripId: string;
  planId?: string;           // 有当前方案时传入
  estimatedCost?: number;
  categoryBreakdown?: { ... }; // 可选
  budgetConstraint?: { total, currency, dailyBudget };
}

// 预览未保存草稿
{
  tripId,
  budgetIntent?: { total, currency, dailyBudget },
  budgetStructure?: { mode, allocations | percentages },
}
```

**前端映射**：

| 响应字段 | UI |
|---------|-----|
| `reason` | 顶栏 Banner、`evaluationMessage` |
| `violations[]` | Checker 超支热点（fallback） |
| `hotspots[]` | Checker 超支热点（优先） |
| `recommendations[]` | AI 预算建议（fallback） |
| `optimizations[]` | AI 预算建议 + apply id（优先） |
| `evidence[]` | 证据 Tab |
| `evidenceRefs[]` | 证据 id 索引 |

**实现**：`useBudgetTabEvaluation` → `BudgetTab` → `BudgetPlanningWorkbench`

---

## 4. 分类命名边界（重要）

| 层 | 字段名 |
|----|--------|
| L2 结构 `BudgetStructure.allocations` | `experience` |
| actuals / evaluate breakdown | `activities` |

前端统一在 **`normalizeBudgetAllocations`** 做 alias：

- 读：`activities` → `experience`
- 写 evaluate：`experience` → `activities`（`allocationsToEvaluateBreakdown`）

文件：`src/lib/trip-budget-normalize.ts`

---

## 5. Wallet + 费用（P0）

| 接口 | UI |
|------|-----|
| `GET .../budget/wallet` | members + paymentRule |
| `GET .../budget/wallet/balances` | 欠账摘要 |
| `POST .../budget/wallet/ledger` | 手动记账 |
| `PATCH /itinerary-items/{id}/cost` | 行程项费用 + `splitAmongUserIds` |

`wallet.members` 为空时，前端回退 **split consensus simulation** 成员。

---

## 6. 优先级路线图

### P0（当前迭代）

- [x] `GET /budget/profile` + breakdown 归一化
- [x] `POST budget/evaluate` 接入 Checker / Banner
- [ ] 确认 `PUT intent/structure` 服务端持久化（去掉 localStorage 主路径）
- [ ] `wallet.members` 从 roster 同步

### P1

- [x] `POST .../budget/apply-optimization` →「生成预算优化草案」/ 单条「应用」
- [x] `GET .../budget/details` → 证据 Tab（evidence + priceEvidence + optimizations）
- [x] `POST .../budget/compare` → 主栏 A/B/C 方案对比矩阵
- [x] Assistant「与 Nara 讨论」预算上下文（后端 `active_trip_summary` 注入，前端仅需 `tripId`）

#### 场景 · 接口对照

| 场景 | 接口 |
|------|------|
| 预算 Tab 主数据 | `GET /trips/:id/budget/profile?include=actuals,wallet,value` |
| Checker 评估 | `POST /planning-workbench/budget/evaluate` |
| 证据 Tab | `GET /planning-workbench/budget/details?tripId=&planId=` |
| A/B/C 对比 | `POST /planning-workbench/budget/compare` |
| 应用优化 | `POST /planning-workbench/budget/apply-optimization` |

#### budget/details

```typescript
// planId 可选；不传时 evidence/optimizations 为空，仍有 profile + priceEvidence
GET /planning-workbench/budget/details?tripId=xxx&planId=yyy
```

| 字段 | UI |
|------|-----|
| `profile` | 与 Tab 主 profile 对齐（含 actuals/wallet） |
| `evidence[]` | Checker 证据 Tab（优先于 evaluate 内联） |
| `optimizations[]` | 待应用草案 + apply id |
| `priceEvidence` | L1/L2 分配说明 + 汇率参考 |

#### budget/compare

```typescript
POST /planning-workbench/budget/compare
{
  tripId,
  plans: [{ planId, label, estimatedCost, categoryBreakdown }],
  optionComparison?: { schema: 'tripnara.option_comparison@v1', options: [...] } // 可选合并
}
// Response: tripnara.budget_comparison@v1 + optionComparison BFF
```

| 响应字段 | UI |
|---------|-----|
| `optionComparison.options[].budget` | cost 列文案 / 矩阵行 |
| `optionComparison.options[].scores.cost` | cost 分数（越低越省） |
| `optionComparison.budgetComparison.recommendedPlanId` | 推荐 badge |
| `optionComparison.options[].budget.verdict` + `kernelGateEval` | 门控列 |
| `plans[]` | legacy fallback（无 BFF 时） |

**读模型优先级**：`response.optionComparison` → `planStudioCompareStore` → `plans[]` 映射。

#### apply-optimization 对接流程

```typescript
// 1. 评估（生成带 id 的 optimizations[]）
const evaluation = await planningWorkbenchApi.evaluateBudget({ tripId, planId, ... });

// 2. 预览全部草案
await planningWorkbenchApi.applyBudgetOptimization({
  planId: evaluation.planId ?? planId,
  tripId,
  optimizationIds: evaluation.optimizations!.map((o) => o.id),
  autoCommit: false,
});

// 3. 应用单条
await planningWorkbenchApi.applyBudgetOptimization({
  planId,
  tripId,
  optimizationIds: ['opt-...'],
  autoCommit: true,
});
```

| 响应字段 | UI |
|---------|-----|
| `optimizations[]` | Checker 建议列表 + `optimizationId` |
| `evidence[]` | 证据 Tab |
| `hotspots[]` | Checker 热点（优先于 violations） |
| `apply-optimization.totalSavings` | Toast / 预览摘要 |
| `apply-optimization.dryRun` | `autoCommit: false` 时为 true |

### P2

- [ ] `GET .../budget/structure/presets`（Money DNA）
- [ ] L4 value-feedback / value-summary

---

## 7. 代码入口

| 文件 | 职责 |
|------|------|
| `src/api/trip-budget.ts` | profile / intent / structure / wallet |
| `src/api/planning-workbench.ts` | evaluate / details / compare / apply-optimization |
| `src/lib/budget-compare.util.ts` | compare 请求构建 + 矩阵映射 |
| `src/hooks/useBudgetWorkbenchDetails.ts` | details 生命周期 |
| `src/hooks/useBudgetPlanComparison.ts` | compare 生命周期 |
| `src/lib/trip-budget-normalize.ts` | activities ↔ experience |
| `src/lib/budget-evaluate.util.ts` | evaluate → UI 模型 |
| `src/hooks/useBudgetTabEvaluation.ts` | Tab 内 evaluate 生命周期 |
| `src/pages/plan-studio/BudgetTab.tsx` | 组装 profile + evaluate |
| `src/components/budget/workbench/*` | 三栏 UI |

---

## 8. 刷新策略

用户点击 Checker 刷新：

```typescript
void reload();
void refreshEvaluation();
void refreshDetails();    // GET budget/details
void refreshComparison(); // POST budget/compare
```

Profile `updatedAt` 或 intent/actuals 变化时，`useBudgetTabEvaluation` 自动重评估。
