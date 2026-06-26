# Guardian P0/P1/P2 — 前端改动清单（实现状态）

> **SSOT 类型**: `src/types/guardian-presentation.ts` · `src/types/guardian-choose.ts`  
> **工具**: `src/lib/guardian-presentation.util.ts` · `src/lib/guardian-choose-submit.ts`  
> **后端契约**: 见集成文档 § 与后端对齐字段  
> **Legacy 审计**: [`guardian-legacy-ui-audit-matrix.md`](./guardian-legacy-ui-audit-matrix.md)

---

## 一、类型

| 项 | 状态 | 说明 |
|----|------|------|
| `GuardianPersonaPresentation.hardConstraintBlocked` | ✅ | `src/types/guardian-presentation.ts` |
| `NegotiationResponse.hardConstraintBlocked` | ✅ | `src/types/optimization-v2.ts` |
| `TeamNegotiationResponse.hardConstraintBlocked` | ✅ | 同上 |
| `TeamNegotiationResponse.evaluationSummary` | ✅ | 同上 |
| `TeamNegotiationResponse.humanDecisionPointsFlat` | ✅ | 同上 |
| `GuardianHumanChoiceSource.team_negotiation` | ✅ | `src/types/guardian-choose.ts` |

---

## 二、必须停用的旧逻辑

| 停用项 | 状态 |
|--------|------|
| 三人轮流长段独白（有 presentation 时） | ✅ `GuardianAssistantBlock` / `shouldShowPersonaInsightCards` |
| 前端自算 leadSpeaker | ✅ 只渲染 `presentation.leadSpeaker` |
| 关键词猜硬约束（有结构化字段时） | ✅ `hardConstraintBlocked === false` 跳过关键词 |
| 硬约束时 CHOOSE | ✅ `canShowGuardianChoose` / `isHardConstraintBlock` |
| 只读 personas 忽略 presentation | ✅ `normalizeWorkbenchUiOutput` |

---

## 三、统一 helper

| 函数 | 路径 |
|------|------|
| `extractPlanningAssistantPresentation` | 场景 2 · `POST /api/agent/planning-assistant/chat` → `personaEvaluation.presentation` |
| `extractGuardianPresentation` | 通用 fallback（workbench / planner 等） |
| `extractChooseOptions` | 同上 — 全场景 CHOOSE 选项 |
| `canShowGuardianChoose` | 同上 |
| `isNegotiationHardBlocked` / `isTeamNegotiationHardBlocked` | 同上 — `hardConstraintBlocked` 优先 |
| `submitGuardianHumanChoice` | `guardian-choose-submit.ts` — 优先 `POST /v2/trips/:tripId/guardian/choose`，404/501/503 回退 feedback |

---

## 四、UI 组件

| 组件 | 状态 |
|------|------|
| `GuardianDecisionCard` | ✅ 单卡 + Markdown；硬约束禁用 CHOOSE 链 |
| `GuardianBriefBanner` | ✅ `briefLines ?? narrative` |
| `GuardianPresentationPanel` | ✅ `canShowGuardianChoose` 门控 |
| `GuardianChooseModal` | ✅ Negotiation / Workbench / Team / Assistant |
| `GuardianTimelineBadges` | ✅ decision-log metadata |

---

## 五、按页面

| 页面 | 状态 | 备注 |
|------|------|------|
| 规划工作台 | ✅ | `GuardianAssistantBlock` + `nextSteps` |
| 规划助手（场景 2） | ✅ | `POST /api/agent/planning-assistant/chat` → `personaEvaluation.presentation` |
| 规划助手 V2 | ✅ | 同上 `extractPlanningAssistantPresentation` |
| Negotiation 面板 | ✅ | CHOOSE 后读响应 `presentation` |
| Team 协商 | ✅ | `humanDecisionPointsFlat` + CHOOSE 后 `presentation` |
| Readiness deferred | ✅ | `FeasibilityRepairDeferredChoose` · `source: readiness_repair` |
| Readiness 修复（stance 摘要） | ⚠️ | `GuardianNegotiationPanel` 仍独立 |
| Decision 时间线 | ✅ | `revalidationPass` / enrich |
| Trip Planner | ✅ | `guardianPresentation` + `execution_brief` |
| Persona Alerts | ⚠️ | 未合并进单主角卡（P2 可选） |

---

## 六、自测检查项

- [ ] 工作台只显示一个主角叙事
- [ ] 硬约束无 CHOOSE、无「忽略风险」
- [ ] NEEDS_HUMAN 选项与 `humanDecisionPoints` / `nextSteps` 一致
- [ ] Team 读 `humanDecisionPointsFlat` 可弹 Choose
- [ ] 行中 `briefLines` 短句
- [ ] Choose 走 `guardian/choose`；409 有 toast；未部署时回退 feedback

---

## 七、后端依赖（阻塞闭环）

1. `POST /v2/trips/:tripId/guardian/choose` — 写回 + `nextAction`
2. 各读接口输出 `presentation` + `hardConstraintBlocked`
3. Team 协商返回 `humanDecisionPointsFlat` + `evaluationSummary.criticalConcerns`
