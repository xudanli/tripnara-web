# Guardian Legacy UI — 审计矩阵

> **SSOT 表达层**: `src/components/guardian/` · `src/lib/guardian-presentation.util.ts`  
> **集成文档**: [`guardian-persona-frontend-integration.md`](./guardian-persona-frontend-integration.md)  
> **更新**: 2026-06-25

---

## 1. 目标

记录仍使用旧版三人格 UI 的路径，明确迁移状态与阻塞项，避免双轨长期并存。

---

## 2. 组件矩阵

| 旧组件 / 路径 | 场景 | 新组件 / 策略 | 状态 | 阻塞 |
|---------------|------|---------------|------|------|
| `trip-planner/guardian/GuardianPanel` | Trip Planner 三人 insight 卡片 | `GuardianPresentationPanel` / `GuardianAssistantBlock` | **deprecated**，仅 `decision_committee` 或无 presentation | 无 |
| `PlanningAssistantChat` / `JourneyAssistantChat` 内联 `ExpertCitationsPanel` | 助手专家引用气泡 | `GuardianLegacyCitations` 门控 | **已迁移** | 无 |
| `GuardianDebateClarificationCard` | route-and-run 澄清 `guardian_debate` | 保留；与 presentation 不同数据源 | **保留** | 澄清协议未并入 presentation |
| `NegotiationResultCard` utility 区块 | 优化协商三人分数 | 默认 `showUtilityScores=false` | **已收敛** | 无 |
| `TeamNegotiationResultCard` utility 行 | 团队协商成员分数 | 默认 `showMemberUtilityScores=false` | **已收敛** | 无 |
| `JudgmentPointDialog` | 优化 `userJudgmentPoints` 多题确认 | `GuardianChooseModal` 仅适合单点/扁平选项 | **并存** | 多题结构化 UI 未合并 |
| `GuardianNegotiationPanel` | 准备度 repair stance | 独立域模型，非 `GuardianPersonaPresentation` | **有意分离** | 产品域不同 |
| workbench `PersonaCard` ×3 | 规划工作台详情 | 有 presentation 时折叠，committee 时展开 | **已门控** | 无 |

---

## 3. CHOOSE 写回矩阵

| 入口 | 写回 | 状态 | 阻塞 |
|------|------|------|------|
| `GuardianPresentationPanel` / `GuardianAssistantBlock` | `submitGuardianHumanChoice` → optimization feedback | **已闭环** | 无专用 confirm API |
| `NegotiationResultCard` NEEDS_HUMAN | 同上 `source: negotiation` | **已闭环** | 无 |
| `OptimizationWorkbench` judgment | 同上 `source: optimize_judgment` | **已闭环** | 仍用 `JudgmentPointDialog` UI |
| `TeamNegotiationResultCard` NEEDS_HUMAN | 同上 `source: team_negotiation` | **已闭环** | 待后端 `humanDecisionPointsFlat` |
| `GuardianDebateClarificationCard` | 澄清回复流 | **不同协议** | route-and-run 专用 |

---

## 4. decision-log 矩阵

| 页面 | 组件 | Guardian 元数据 | 状态 |
|------|------|-----------------|------|
| 规划工作台 budget log | `DecisionTimeline` | `GuardianTimelineBadges` + `enrichWorkbenchDecisionLogEntry` | **已接** |
| 行程详情 decision log | `[id].tsx` 自定义列表 | `GuardianTimelineBadges` | **部分**（未用 enrich view model 扩展 reason） |
| API metadata 字段 | `revalidationPass` 等 | `guardian-decision-log-display.ts` | **类型已对齐** |

---

## 5. 推荐后续（按优先级）

1. **P1** — 后端团队协商补充 `humanDecisionPoints` 后，在 `TeamNegotiationResultCard` 复用 `GuardianChooseModal` + `useGuardianHumanChoice`
2. **P2** — `JudgmentPointDialog` 内部单题路径委托 `GuardianChooseModal`（多题仍保留现 UI）
3. **P2** — 行程详情 decision log 复用 `buildGuardianDecisionLogView` 填充副文案
4. **P3** — `GuardianDebateClarificationCard` 在响应含 `presentation` 时降级为 supportingLines 摘要

---

## 6. 禁止回退

- ❌ 默认重新打开 utility 气泡（`showUtilityScores` / `showMemberUtilityScores`）
- ❌ 硬约束场景提供「忽略并继续」
- ❌ 在前端重写 `leadSpeaker` 或三人轮播长独白
