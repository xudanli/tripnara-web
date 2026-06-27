# relaxation_suggestions BFF 契约（v1 · 已落地）

> **版本**: 1.1.0  
> **状态**: 后端已落地 · 前端已对接（2026-06-27）  
> **受众**: Agent / BFF / 前端  
> **关联**:
> - `src/types/relaxation-suggestions.ts`
> - `src/lib/relaxation-suggestions-parse.util.ts`
> - `src/components/plan-studio/RelaxationSuggestionBar.tsx`
> - `src/hooks/useRelaxationSuggestionsModel.ts`
> - `src/hooks/useRelaxationSuggestionSubmit.ts`
> - `docs/api/explain-alternatives-bff-contract.md` — alternatives 矩阵（独立）

**最后更新**: 2026-06-27

---

## 1. 触发场景

当 `route_and_run` 返回 **`NEED_MORE_INFO`** 且澄清题为以下之一时，BFF 自动投影：

| questionId | 场景 |
|------------|------|
| `early_warning_relaxations` | Shadow EW 拦截 |
| `plan_gen_empty_draft_relax_constraints` | PLAN_GEN 熔断 |

---

## 2. 响应字段

挂载于 **`result.payload`**（并镜像到 **`result.payload.ui_display`**）：

```typescript
relaxation_suggestions: Array<{
  schema: 'tripnara.relaxation_suggestion@v1';
  actionId: string;           // 回传 clarification_answers[].value
  labelZh: string;
  descriptionZh: string;
  kind: 'relaxation' | 'proceed_at_own_risk' | 'accept_no_solution' | 'manual_relax_constraints';
  confidence?: 'high_probability_fixed' | 'needs_more_changes';
  score?: number;
  pathGroup?: 'path_a' | 'path_b' | 'other';
  recommended?: boolean;
  metadata?: {
    fixed_conflict_types?: string[];
    violations_before?: number;
    violations_after?: number;
  };
}>;

relaxation_suggestions_context: {
  schema: 'tripnara.relaxation_suggestions@v1';
  questionId: string;
  selectionMode: 'single' | 'multi';
  headlineZh?: string;
  riskLevel?: string;
  conflictType?: string;
  failureRiskScore?: number;
  failureProbHintZh?: string;
};
```

---

## 3. 前端读取规则

| 规则 | 说明 |
|------|------|
| **读** | `parseRelaxationSuggestionsBundle(response)` → payload 或 ui_display 镜像 |
| **勿读** | `clarificationQuestions[].options` 内机器 label（如 `upgrade_vehicle_to_4wd｜…`） |
| **展示** | Plan Studio `RelaxationSuggestionBar`：`labelZh` + `descriptionZh` + `recommended` |
| **可见** | `suggestions.length > 0` 且 `context.questionId` 存在（不限于 Strip blocked） |

---

## 4. 提交规则

用户选择后走既有澄清回传：

```json
{
  "clarification_answers": [
    {
      "questionId": "<relaxation_suggestions_context.questionId>",
      "value": ["upgrade_vehicle_to_4wd"]
    }
  ]
}
```

| 项 | 规则 |
|----|------|
| `message` | 空串 `""`（结构化回传，勿回声题干） |
| `value` | **字符串数组**，元素为 `actionId` |
| 单选 | `selectionMode: 'single'` → 点击选项即提交，`value: [actionId]` |
| 多选 | `selectionMode: 'multi'` → 勾选后点「确认选择」，`value: [id1, id2, …]` |

实现：`useRelaxationSuggestionSubmit` → `invokeRouteAndRun` + `entry_point: 'planning_workbench'`。

---

## 5. 前端文件映射

| 职责 | 路径 |
|------|------|
| 类型 | `src/types/relaxation-suggestions.ts` |
| 解析 | `src/lib/relaxation-suggestions-parse.util.ts` |
| 全局 sync | `src/lib/sync-relaxation-suggestions-store.ts` |
| 澄清提交 | `src/lib/relaxation-clarification-submit.util.ts` |
| 读模型 hook | `src/hooks/useRelaxationSuggestionsModel.ts` |
| 提交 hook | `src/hooks/useRelaxationSuggestionSubmit.ts` |
| Plan Studio UI | `src/components/plan-studio/RelaxationSuggestionBar.tsx` |
| Agent UI | `src/components/agent/AgentRelaxationSuggestionsCard.tsx` |
| 分发 sync | `handleRouteAndRunResponse` · `syncPlanningTaskFromPollSnapshot` |
| Store | `planStudioCompareStore.relaxationBundleByTripId` |
| 嵌入 | `PlanStudioPlanningHeader` · `AgentChat` MessageBubble |

---

## 6. 验收

- [x] 解析 `payload.relaxation_suggestions` + `context`
- [x] 展示 `labelZh` / `descriptionZh`，非机器 option label
- [x] 单选点击即 `clarification_answers` 提交
- [x] 多选批量提交
- [x] 提交后刷新 `planningTaskStore` + compare / relaxation bundle

---

## 7. 非目标

- ❌ 从 `clarificationQuestions.options` 解析松弛项
- ❌ 松弛条内第二 filled 主按钮（单选即选项点击提交）
- ❌ 直接写约束 API（仍经 `route_and_run` 澄清链）
