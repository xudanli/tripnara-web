# 产品经理 Agent 提示词 - 预算内容补充建议

> 生成时间: 2025-01-XX  
> 检查范围: `.claude/agents/产品经理.md` (1-352行)  
> 参考实现: `src/api/planning-workbench.ts`、`src/api/trips.ts`、`docs/预算功能接口需求清单.md`

---

## 📋 需要补充预算内容的位置清单

### ✅ 高优先级（必须补充）

#### 1. **第5行 - TripNARA 范式描述**
**当前内容**：
> 你擅长将 DEM 地形、可达性、时刻表/票务、**风险门控**、替代方案、多智能体决策日志、端到端闭环结构化为清晰、可研发、可验收、可上线的 PRD。

**建议补充**：
> 你擅长将 DEM 地形、可达性、时刻表/票务、**风险门控、预算门控**、替代方案、多智能体决策日志、端到端闭环结构化为清晰、可研发、可验收、可上线的 PRD。

---

#### 2. **第50-54行 - Should-Exist Gate 核心能力**
**当前内容**：
```
**Should-Exist Gate（路线存在性门控）**：
- 执行位置：Agent 决策流程中（通过 `RouteAndRunResponse` 返回）
- 负责 Agent：GatekeeperAgent（Abu）
- 输出：通过 `DecisionLogItem` 记录决策过程
- 三人格评审：Abu（安全）、Dr.Dre（节奏）、Neptune（修复）
```

**建议补充**：
```
**Should-Exist Gate（路线存在性门控）**：
- 执行位置：Agent 决策流程中（通过 `RouteAndRunResponse` 返回）
- 负责 Agent：GatekeeperAgent（Abu）
- 输出：通过 `DecisionLogItem` 记录决策过程
- 三人格评审：Abu（安全）、Dr.Dre（节奏）、Neptune（修复）
- **预算门控**：
  - 评估位置：规划工作台执行流程中（通过 `POST /planning-workbench/budget/evaluate` 接口）
  - 评估时机：方案生成后、提交前
  - 评估结果：`ALLOW`（允许）/ `NEED_ADJUST`（需要调整）/ `REJECT`（拒绝）
  - 决策日志：通过 `GET /planning-workbench/budget/decision-log` 获取
  - 优化建议：通过 `POST /planning-workbench/budget/apply-optimization` 应用
  - 参考接口：`src/api/planning-workbench.ts` - `evaluateBudget()`、`getBudgetDecisionLog()`、`applyBudgetOptimization()`
```

---

#### 3. **第66-71行 - 三人格决策系统**
**当前内容**：
```
**三人格决策系统**：
- **Abu**（GatekeeperAgent）：安全与现实守门
- **Dr.Dre**（PaceAgent / CoreDecisionAgent）：节奏与体感
- **Neptune**（LocalInsightAgent）：空间结构修复
- 只暴露三人格给用户，其他 Sub-Agents 隐藏
- 类型定义：`PersonaType = 'abu' | 'drdre' | 'neptune'`（定义在 `src/types/suggestion.ts`）
```

**建议补充**：
```
**三人格决策系统**：
- **Abu**（GatekeeperAgent）：安全与现实守门、**预算合理性评估**
- **Dr.Dre**（PaceAgent / CoreDecisionAgent）：节奏与体感、**预算节奏优化**
- **Neptune**（LocalInsightAgent）：空间结构修复、**预算结构调整建议**
- 只暴露三人格给用户，其他 Sub-Agents 隐藏
- 类型定义：`PersonaType = 'abu' | 'drdre' | 'neptune'`（定义在 `src/types/suggestion.ts`）
- **预算评估职责**：
  - Abu 负责评估方案是否符合预算约束，给出 `ALLOW`/`NEED_ADJUST`/`REJECT` 裁决
  - Dr.Dre 负责评估预算节奏是否合理（日均支出、分类占比）
  - Neptune 负责提供预算结构调整建议（替代方案、优化建议）
```

---

#### 4. **第224-227行 - PRD 目录模板 0.8 章节**
**当前内容**：
```
- **0.8** 核心能力：Should-Exist Gate（路线存在性决策）
  - GatekeeperAgent（Abu）职责
  - 决策日志格式（`DecisionLogItem`）
  - 三人格评审流程
```

**建议补充**：
```
- **0.8** 核心能力：Should-Exist Gate（路线存在性决策）
  - GatekeeperAgent（Abu）职责
  - 决策日志格式（`DecisionLogItem`）
  - 三人格评审流程
  - **预算门控规则**：
    - 预算约束数据结构（`BudgetConstraint`，参考 `src/api/planning-workbench.ts`）
    - 预算评估接口（`POST /planning-workbench/budget/evaluate`）
    - 预算决策日志（`GET /planning-workbench/budget/decision-log`）
    - 预算优化建议应用（`POST /planning-workbench/budget/apply-optimization`）
    - 评估结果裁决：`ALLOW` / `NEED_ADJUST` / `REJECT`
    - 三人格预算评估职责分工
```

---

#### 5. **第231-233行 - PRD 目录模板 0.10 章节（新增预算评估章节）**
**当前内容**：
```
- **0.10** 核心能力：DEM 地形与体力模型（坡度/爬升/疲劳/风险）
  - RESEARCH 阶段 DEM 数据收集
  - VERIFY 阶段疲劳评分
```

**建议补充**：
```
- **0.10** 核心能力：DEM 地形与体力模型（坡度/爬升/疲劳/风险）
  - RESEARCH 阶段 DEM 数据收集
  - VERIFY 阶段疲劳评分
- **0.10.1** 核心能力：预算评估与约束（预算合理性/分类占比/优化建议）
  - 预算约束设置（`BudgetConstraint`，参考 `src/api/planning-workbench.ts`）
  - 预算评估流程（`POST /planning-workbench/budget/evaluate`）
  - 预算决策日志（`GET /planning-workbench/budget/decision-log`）
  - 预算优化建议（`POST /planning-workbench/budget/apply-optimization`）
  - 预算执行监控（`GET /trips/:id/budget/monitor`，参考 `src/api/trips.ts`）
  - 预算统计与分析（`GET /trips/:id/budget/statistics`）
  - 三人格预算评估职责（Abu 裁决、Dr.Dre 节奏、Neptune 结构调整）
```

---

#### 6. **第239-243行 - PRD 目录模板 0.12 章节（数据模型）**
**当前内容**：
```
- **0.12** 数据模型与字段字典（Entity/字段/来源/校验/状态机）
  - `RouteAndRunRequest`、`RouteAndRunResponse`（参考 `src/api/agent.ts`）
  - `TripDetail`、`TripDay`、`ItineraryItem`（参考 `src/types/trip.ts`）
  - `OrchestrationResult`（参考 `src/services/orchestrator.ts`）
  - `PlanState`（参考 `src/api/planning-workbench.ts`）
```

**建议补充**：
```
- **0.12** 数据模型与字段字典（Entity/字段/来源/校验/状态机）
  - `RouteAndRunRequest`、`RouteAndRunResponse`（参考 `src/api/agent.ts`）
  - `TripDetail`、`TripDay`、`ItineraryItem`（参考 `src/types/trip.ts`）
  - `OrchestrationResult`（参考 `src/services/orchestrator.ts`）
  - `PlanState`（参考 `src/api/planning-workbench.ts`）
  - **预算相关数据模型**：
    - `BudgetConstraint`（预算约束，参考 `src/api/planning-workbench.ts`）
    - `BudgetSummary`（预算摘要，参考 `src/types/trip.ts`）
    - `BudgetEvaluationResponse`（预算评估响应，参考 `src/types/trip.ts`）
    - `BudgetDecisionLogItem`（预算决策日志项，参考 `src/types/trip.ts`）
    - `PlanBudgetEvaluationResponse`（规划方案预算评估，参考 `src/types/trip.ts`）
```

---

#### 7. **第248-252行 - PRD 目录模板 0.14 章节（服务端与接口）**
**当前内容**：
```
- **0.14** 服务端与接口（API、权限、缓存、降级、容灾）
  - `POST /agent/route_and_run` 接口（参考 `src/api/agent.ts`）
  - 路由策略（SYSTEM1 vs SYSTEM2）
  - 降级策略
  - 审批流程（`NEED_CONFIRMATION` + `SuspensionInfo`）
```

**建议补充**：
```
- **0.14** 服务端与接口（API、权限、缓存、降级、容灾）
  - `POST /agent/route_and_run` 接口（参考 `src/api/agent.ts`）
  - 路由策略（SYSTEM1 vs SYSTEM2）
  - 降级策略
  - 审批流程（`NEED_CONFIRMATION` + `SuspensionInfo`）
  - **预算相关接口**（参考 `src/api/planning-workbench.ts`、`src/api/trips.ts`）：
    - `POST /planning-workbench/budget/evaluate` - 预算合理性评估（Should-Exist Gate）
    - `GET /planning-workbench/budget/decision-log` - 获取预算决策日志
    - `POST /planning-workbench/budget/apply-optimization` - 应用预算优化建议
    - `GET /planning-workbench/plans/:planId/budget-evaluation` - 获取规划方案预算评估结果
    - `POST /trips/:id/budget/constraint` - 设置预算约束
    - `GET /trips/:id/budget/constraint` - 获取预算约束
    - `DELETE /trips/:id/budget/constraint` - 删除预算约束
    - `GET /trips/:id/budget/summary` - 获取预算摘要
    - `GET /trips/:id/budget/details` - 获取预算明细
    - `GET /trips/:id/budget/trends` - 获取预算趋势
    - `GET /trips/:id/budget/statistics` - 获取预算统计
    - `GET /trips/:id/budget/monitor` - 实时预算监控
```

---

#### 8. **第310行 - 关键文件位置**
**当前内容**：
```
- **规划工作台 API**：`src/api/planning-workbench.ts`
```

**建议补充**：
```
- **规划工作台 API**：`src/api/planning-workbench.ts`
  - 预算评估接口：`evaluateBudget()`、`getBudgetDecisionLog()`、`applyBudgetOptimization()`、`getPlanBudgetEvaluation()`
- **行程预算 API**：`src/api/trips.ts`
  - 预算约束管理：`setBudgetConstraint()`、`getBudgetConstraint()`、`deleteBudgetConstraint()`
  - 预算查询分析：`getBudgetSummary()`、`getBudgetDetails()`、`getBudgetTrends()`、`getBudgetStatistics()`、`getBudgetMonitor()`
- **预算页面组件**：`src/pages/trips/budget.tsx`
- **规划工作台预算集成**：`src/pages/plan-studio/PlanningWorkbenchTab.tsx`
```

---

### ⚠️ 中优先级（建议补充）

#### 9. **第23行 - TripNARA 产品哲学**
**当前内容**：
> **TripNARA 产品哲学优先**：决策优先、可执行优先、安全与可达性门控优先、解释与责任优先。

**建议补充**：
> **TripNARA 产品哲学优先**：决策优先、可执行优先、**安全与可达性门控优先、预算门控优先**、解释与责任优先。

---

#### 10. **第120行 - 收集信息清单第6点**
**当前内容**：
> 6. **核心决策门控**：路线"允许/不允许/需要调整"的规则来源（安全/可达性/预算/时间/体力）

**建议补充**：
> 6. **核心决策门控**：路线"允许/不允许/需要调整"的规则来源（安全/可达性/**预算**/时间/体力）
>    - **预算门控规则**：总预算约束、分类预算限制、日均预算、预警阈值
>    - **预算评估时机**：方案生成后、提交前
>    - **预算评估结果**：`ALLOW`（允许）/ `NEED_ADJUST`（需要调整）/ `REJECT`（拒绝）
>    - **预算优化建议**：替代方案、结构调整、成本优化

---

#### 11. **第235-238行 - PRD 目录模板 0.11 章节（页面与交互设计）**
**当前内容**：
```
- **0.11** 页面与交互设计（信息架构、组件、状态、文案）
  - 三人格卡片（Abu/Dr.Dre/Neptune）
  - 证据抽屉（Evidence Drawer）
  - 决策日志展示
  - 参考现有组件：`src/components/planning-workbench/PersonaCard.tsx`
```

**建议补充**：
```
- **0.11** 页面与交互设计（信息架构、组件、状态、文案）
  - 三人格卡片（Abu/Dr.Dre/Neptune）
  - 证据抽屉（Evidence Drawer）
  - 决策日志展示
  - 参考现有组件：`src/components/planning-workbench/PersonaCard.tsx`
  - **预算相关 UI 组件**：
    - 预算评估结果卡片（显示裁决、违规项、优化建议）
    - 预算约束设置对话框（参考 `src/pages/trips/budget.tsx`）
    - 预算决策日志对话框（显示三人格评估过程）
    - 预算优化建议应用按钮（参考 `src/pages/plan-studio/PlanningWorkbenchTab.tsx`）
    - 预算页面标签页（概览/明细/趋势/统计/监控，参考 `src/pages/trips/budget.tsx`）
```

---

### 📝 低优先级（可选补充）

#### 12. **第83-88行 - 风险与合规**
**建议补充**：
```
### 风险与合规

- 极端天气/安全/救援/签证/保险提示
- 合规检查（ComplianceAgent）
- 责任边界、免责声明、人工兜底
- 审批流程：`NEED_CONFIRMATION` 状态触发 `SuspensionInfo`（定义在 `src/api/agent.ts`）
- **预算风险提示**：
  - 预算超支预警（达到预警阈值时提示）
  - 预算不足风险（方案成本超过预算时提示）
  - 预算优化建议免责声明（优化建议仅供参考，实际成本可能因市场波动而变化）
```

---

## 📊 补充优先级总结

| 优先级 | 位置 | 内容 | 影响范围 |
|--------|------|------|----------|
| 🔴 高 | 第50-54行 | Should-Exist Gate 预算门控 | 核心能力定义 |
| 🔴 高 | 第66-71行 | 三人格预算评估职责 | 决策系统 |
| 🔴 高 | 第224-227行 | PRD 0.8 预算门控规则 | PRD 模板 |
| 🔴 高 | 第231-233行 | PRD 0.10.1 预算评估章节 | PRD 模板 |
| 🔴 高 | 第239-243行 | PRD 0.12 预算数据模型 | PRD 模板 |
| 🔴 高 | 第248-252行 | PRD 0.14 预算接口清单 | PRD 模板 |
| 🔴 高 | 第310行 | 关键文件位置预算 API | 技术栈 |
| 🟡 中 | 第5行 | TripNARA 范式描述 | 角色定位 |
| 🟡 中 | 第23行 | 产品哲学预算门控 | 总体规则 |
| 🟡 中 | 第120行 | 收集信息清单预算规则 | 信息收集 |
| 🟡 中 | 第235-238行 | PRD 0.11 预算 UI 组件 | PRD 模板 |
| 🟢 低 | 第83-88行 | 风险与合规预算风险 | 风险管控 |

---

## ✅ 实施建议

1. **立即补充**：高优先级位置（7处），确保预算功能在 PRD 生成流程中完整体现
2. **逐步完善**：中优先级位置（4处），在生成具体 PRD 时补充细节
3. **按需补充**：低优先级位置（1处），根据实际需求场景补充

---

## 📚 参考文档

- `src/api/planning-workbench.ts` - 规划工作台预算评估接口
- `src/api/trips.ts` - 行程预算管理接口
- `src/types/trip.ts` - 预算相关类型定义
- `docs/预算功能接口需求清单.md` - 预算功能完整接口清单
- `docs/预算功能完整实现总结.md` - 预算功能实现总结
