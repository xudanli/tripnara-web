# explain.alternatives & relaxation_suggestions BFF 契约

> **版本**: 1.0.0  
> **状态**: M2 草案 · 前端已部分对接  
> **受众**: Agent / BFF / 前端  
> **关联**:
> - `docs/prd/plan-studio-decision-strip-prd-v0.2-supplement.md`
> - `docs/design/plan-studio-interaction-boundary.md`
> - `src/types/solution-comparison.ts`
> - `src/lib/solution-comparison-parse.util.ts`
> - `src/api/planning-workbench.ts` → `OptionComparison`

**最后更新**: 2026-06-27

---

## 1. 背景

Plan Studio **方案矩阵**（`SolutionMatrixPanel`）读模型优先级：

1. `planStudioCompareStore` 中的 `OptionComparison`（workbench / route_and_run `comparison`）
2. `route_and_run` 响应内 `explain.alternatives[]` 投影（≥2 条时）
3. `relaxation_suggestions[]` → `RelaxationSuggestionBar`（Strip `blocked` 或规划待办时）

C 端 **不得** 暴露内部 option 调试 ID 作为唯一文案；须提供 `label` / `reason` 人话字段。

---

## 2. 字段挂载位置

BFF 可在以下任一位置返回（前端解析顺序）：

| 字段 | 推荐挂载 | 备选 |
|------|----------|------|
| `alternatives[]` | `result.explain.alternatives` | `result.explain.optimization.alternatives`、`result.payload.comparison` |
| `relaxation_suggestions[]` | `result.explain.relaxation_suggestions` | 顶层 `relaxation_suggestions` |
| `comparison` | `result.comparison` / workbench uiOutput | 已有 `OptionComparison` |

---

## 3. `explain.alternatives[]`

### 3.1 单条 schema

```yaml
ExplainAlternative:
  type: object
  required: [id]
  properties:
    id:
      type: string
      description: 方案稳定 ID，与 workbench optionId 对齐
    label:
      type: string
      description: C 端列头，如「推荐方案」「替代 A」
    summary:
      type: string
      description: 一行说明 / Caveat
    dimension_scores:
      type: object
      description: 各维度 0–100，与矩阵行对齐
      properties:
        overall: { type: number }
        executability: { type: number }
        cost: { type: number }
        fatigue: { type: number }
        risk: { type: number }
    is_recommended:
      type: boolean
    gate_status:
      type: string
      enum: [ALLOW, NEED_CONFIRM, REJECT]
    caveat:
      type: string
      description: 局限性说明（防自信外观陷阱）
```

### 3.2 示例

```json
{
  "explain": {
    "alternatives": [
      {
        "id": "opt-a",
        "label": "紧凑节奏",
        "dimension_scores": { "executability": 88, "cost": 72, "risk": 45 },
        "is_recommended": false,
        "caveat": "Day3 天气不确定"
      },
      {
        "id": "opt-b",
        "label": "推荐方案",
        "dimension_scores": { "executability": 92, "cost": 78, "risk": 38 },
        "is_recommended": true,
        "gate_status": "ALLOW"
      }
    ]
  }
}
```

### 3.3 前端投影规则

- `alternatives.length >= 2` 且尚无 `comparison.recommendation` 时，投影为 `OptionComparison`
- 矩阵 **最多展示 3 列**；超出截断 + Agent「查看更多」
- 推荐列排序第一；差值以推荐列为 baseline

---

## 4. `relaxation_suggestions[]`

### 4.1 单条 schema（Goal Seek）

```yaml
RelaxationSuggestion:
  type: object
  required: [id, constraint_label, suggested_value, delta_label]
  properties:
    id: { type: string }
    constraint_id:
      type: string
      description: 对应 planning-constraints 字段
    constraint_label:
      type: string
      example: 预算上限
    current_value:
      type: string
      example: "¥80,000"
    suggested_value:
      type: string
      example: "¥82,000"
    delta_label:
      type: string
      example: "+¥2,000"
    satisfies_remaining_count:
      type: integer
      description: 接受后仍满足的其余约束数
```

### 4.2 示例

```json
{
  "explain": {
    "relaxation_suggestions": [
      {
        "id": "relax-budget-1",
        "constraint_id": "budget.total",
        "constraint_label": "预算上限",
        "current_value": "¥80,000",
        "suggested_value": "¥82,000",
        "delta_label": "+¥2,000",
        "satisfies_remaining_count": 4
      },
      {
        "id": "relax-date-1",
        "constraint_label": "出发日",
        "suggested_value": "2026-02-05",
        "delta_label": "推迟 3 天",
        "satisfies_remaining_count": 4
      }
    ]
  }
}
```

### 4.3 展示条件

| 条件 | 行为 |
|------|------|
| `relaxation_suggestions.length >= 1` 且 Strip `blocked` | 显示 `RelaxationSuggestionBar` |
| 同上 + `planningInboxCount > 0` | 显示 |
| 无 suggestions 但约束不可解 | **禁止**静默近似解；须返回 suggestions 或 BLOCK 文案 |

### 4.4 写链（M2 决议）

用户点击「接受调整」：

1. 写约束 API（或 budget / dates 专用 endpoint）
2. 触发 `route_and_run` 重算
3. 禁止仅前端改矩阵显示

当前 M2 临时行为：向 Agent 发送预填松弛消息（待 BFF 写链就绪后替换）。

---

## 5. 与 OptionComparison 关系

```
OptionComparison (已有)
├── options[].optionId
├── options[].scores
├── recommendation.optionId + reason
└── kernelGateEval

explain.alternatives[] (新增/互补)
├── 更丰富的 label / caveat / gate_status
└── 无 workbench 时可独立支撑矩阵

合并策略 (mergeSolutionComparisonReadModel)
├── 有 comparison.recommendation → 主真源
├── 无 comparison 但有 alternatives≥2 → 投影 comparison
└── relaxation 始终旁路挂载，不进矩阵列
```

---

## 6. 事件与快路径

| 事件 | 前端行为 |
|------|----------|
| `plan-studio:constraints-changed` source=budget/transport | 矩阵 `refreshing` 800ms |
| `plan-studio:comparison-updated` | 刷新矩阵 / 清除 refreshing |
| 矩阵列选中 | 写入 `planStudioCompareStore.selectedOptionByTripId` |
| Strip CTA `open_plan_gate` | 文案联动「采用 [列 label]」 |

---

## 7. 非目标

- ❌ C 端暴露 `dominant_cid`、Solver 内部 trace
- ❌ 矩阵内第二 filled 主按钮
- ❌ >3 个 alternatives 全部平铺

---

## 8. 验收

- [ ] `explain.alternatives` ≥2 时无 workbench 也能展示矩阵
- [ ] `relaxation_suggestions` 在 BLOCK 态可见
- [ ] 选中非推荐列时 Strip CTA 为「采用 [label]」
- [ ] budget 变更后 800ms 内矩阵有 refreshing 反馈
- [ ] 接受松弛后触发写链（非仅 UI）

---

## 9. RFC 时间表

| 项 | Owner | 截止 |
|----|-------|------|
| `explain.alternatives` schema 定稿 | Agent/BFF | 2026-07-15 |
| `relaxation_suggestions` GATE_EVAL 输出 | Agent/BFF | 2026-07-31 |
| 松弛「接受」写约束 API | BFF | 2026-08-15 |
