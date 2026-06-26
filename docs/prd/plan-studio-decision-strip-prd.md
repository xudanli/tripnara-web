# Plan Studio 决策条（Decision Strip）PRD

**文档类型**：产品需求文档 · 前端主导 · 后端读模型对齐  
**版本**：0.1.0  
**状态**：待评审  
**编制**：产品 / 前端  
**受众**：设计、前端、后端、测试  
**关联文档**：
- `docs/tripnara-interaction-philosophy-prd.md` — 单决策 / AI 主导 / 渐进揭示
- `docs/api/decision-api-audit-matrix.md` — 决策接口收敛与真源
- `docs/api/user-frontend-integration.md` — C 端 BFF 边界
- `docs/api/route-and-run-ui-integration.md` — `explain` 字段渲染

**最后更新**：2026-06-22

---

## 1. 背景与问题

### 1.1 现状

| 维度 | 当前行为 | 用户感知 |
|------|----------|----------|
| 七步编排链展示 | 主要在 Agent 侧边栏、`GlobalCommandBar` 异步任务 | 「只有聊天才是 AI」 |
| Plan Studio 主区 | 日程 / 预算 / 行前 / 团队 Tab；CRUD + 指标 | 传统行程编辑器 |
| 决策结论 | `PlanningBanner`、`DecisionCockpitPanel` 依赖最近一次 `route_and_run` 写入 store | 有结论但无统一入口、无「下一步」 |
| 旧规划工作台 Tab | `PlanningWorkbenchTab` 仍存在，但 plan-studio 已从 Tab 栏移除 `workbench` | 决策链 UI 碎片化、难发现 |
| 进度反馈 | Workbench `execute` 使用前端假进度；Agent 使用真实 `OrchestrationStep` | 工作台「像在跑 AI」但不可信 |

### 1.2 用户痛点

- 进入规划工作台后，**3 秒内不知道「系统已替我想了什么、我该点哪里」**。
- 七步决策链与三人格结论 **藏在侧边栏或折叠面板**，主区与时间轴脱节。
- 业务 Pipeline（6 里程碑）与编排七步 **概念混用**，团队与用户对「进度」理解不一致。

### 1.3 产品机会

Plan Studio 是用户停留最长的规划页面。在此增加 **Decision Strip（决策条）**——不新增 Tab、不恢复 AI 控制台——可在不推翻现有日程编辑的前提下，把产品切到 **决策流程驱动**，与交互哲学 PRD 对齐。

---

## 2. 目标与非目标

### 2.1 目标

| 目标 | 说明 |
|------|------|
| **单决策入口** | 主区顶部唯一回答：现在情况如何？下一步做什么？ |
| **决策链可见** | 编排七步在「进行中 / 展开详情」时可读，默认不抢主内容 |
| **与 Agent 互补** | Strip = 最新一轮结论摘要；侧边栏 = 多轮对话与澄清 |
| **读模型统一** | M1 零新接口；M2 起与接口收敛（见 decision-api-audit-matrix） |

### 2.2 非目标（本 PRD 不做）

- ❌ 恢复 `workbench` / `optimize` / `what-if` Tab
- ❌ 在主区并列健康度、权重滑杆、专家 Debug、多 Tab 协商控制台
- ❌ 替换右侧 `AgentChatSidebar`
- ❌ 重写 ScheduleTab 拖拽编辑体验
- ❌ 后端新造一套「决策 REST」——写链仍走 `route_and_run`

### 2.3 成功指标

| 指标 | 定义 | M1 目标 | M2 目标 |
|------|------|---------|---------|
| 首屏理解率 | 进入 Plan Studio 后 3s 内看到结论文案（可用性测试） | ≥ 80% | ≥ 90% |
| 主按钮点击率 | Strip 主 CTA / 进入该页 UV | 监控基线 | 较基线 +15% |
| 侧边栏依赖度 | 仅打开侧边栏、未看主区的会话占比 | 较基线 -10% | 较基线 -20% |
| 假进度消除 | Workbench 相关路径使用真实 task phase | — | 100% |
| 数据一致投诉 | 「Strip 与 Pipeline 里程碑矛盾」工单 | 0 P0 | 0 P0 |

---

## 3. 概念定义

### 3.1 两套「进度」——必须区分

| 名称 | 数据源 | 展示位置 | 用户文案 |
|------|--------|----------|----------|
| **业务 Pipeline** | `GET /trips/:id/pipeline-status` | Plan Studio **顶栏右侧**（已有） | 明确目标 → 路线成立 → 可执行日程… |
| **编排七步链** | `route_and_run` / `GET /agent/task/status` 的 `current_phase` | **Decision Strip 内**（running 或展开） | 需求接入 → 调研 → 门禁 → 生成 → 验证 → 叙事 |

**硬规则**：同一屏 **不同时** 用两套进度抢注意力。顶栏保留业务里程碑；编排进度 **仅在任务进行中或用户展开「查看依据」时** 展示。

### 3.2 编排七步（用户可见版）

与 `PlanningPipelineProgress` 对齐（`src/components/agent/PlanningPipelineProgress.tsx`）：

1. 意图编译（`INTENT_COMPILE`，可选）
2. 需求接入（`INTAKE`）
3. 数据调研（`RESEARCH`）
4. 兴趣点选择（`POI_SELECTION`）
5. 门禁评估（`GATE_EVAL`）
6. 方案生成（`PLAN_GEN`）
7. 可执行性验证（`VERIFY`）
8. 决策叙事（`NARRATE`）

`REPAIR` 对用户合并展示为「验证与修复」阶段，不单独占一步。

### 3.3 Decision Strip 三层（渐进揭示）

```
结论层（默认） → 原因层（展开 Strip） → 数据层（EvidenceDrawer / decision_log）
```

---

## 4. 信息架构

### 4.1 页面结构（Plan Studio）

```
┌─ 顶栏：标题 · 业务 Pipeline 指示器 · 工具按钮 ─────────────┐
├─ TripSummaryBar / NarrativeTheme（已有）─────────────────────┤
├─ ★ Decision Strip（新增）───────────────────────────────────┤
├─ PlanningBanner · WorldConstraintBanner（已有）──────────────┤
├─ DecisionCockpitPanel（已有，M1 后默认折叠，由 Strip 摘要替代）│
├─ Tabs：日程 | 预算 | 行前 | 团队 ────────────────────────────┤
│   主内容区                                                   │
└─────────────────────────────────────────────────────────────┘
│ AgentChatSidebar（右侧，不变）                               │
```

### 4.2 Strip 状态机

| 状态 | 触发条件 | 默认展示 |
|------|----------|----------|
| `idle` | 无最近编排、无 guards | 轻提示：「向助手描述需求，或点击下方日程微调」+ 可选「打开助手」 |
| `running` | `planningTaskStore` 或 async task 进行中 | 结论占位 + `PlanningPipelineProgress` + 取消（若后端支持） |
| `conclusion` | 最近一次 `route_and_run` OK / ADJUST | 一句话结论 + 评分（若有）+ **一个主 CTA** |
| `needs_user` | `NEED_MORE_INFO` / `NEED_CONSENT` / `NEED_CONFIRMATION` | 结论 + 主 CTA 指向侧边栏或内联确认 |
| `blocked` | Gate BLOCK / 严重 VERIFY | 警告结论 + 「查看依据」+ 主 CTA「调整方案」 |
| `error` | FAILED / TIMEOUT | 错误摘要 + 「重试」 |

---

## 5. 交互规格

### 5.1 结论层（默认折叠 Strip 高度）

**布局（文字原型）**

```
────────────────────────────────────────────
⚠️ 建议优化后继续          行程评分 78
Abu：Day2 驾驶 5.5h，存在疲劳风险

[ 一键优化 ]                    [ 查看依据 ⌄ ]
────────────────────────────────────────────
```

**字段来源（M1）**

| UI 字段 | 数据源 | 降级 |
|---------|--------|------|
| 状态图标 / 色调 | `explain.world_model_guards` + `consolidatedDecision` 投影 | 无 guards 时用 `persona-alerts` 最高优先级 |
| 一句话结论 | `PlanningBanner` 同源：`resolvePlanningBannerText(guards)` | `result.answer_text` 首句 |
| 评分 | `explain.optimization` / readiness score | 隐藏 |
| 三人格摘要 | 仅展示 **最高优先级 1 条**（Abu > Dre > Neptune 风险序） | 无则隐藏该行 |
| 主 CTA | 见 §5.3 | 仅「打开助手」 |
| 次操作 | 「查看依据」展开 Strip；**不得**再增加第二个主按钮 |

### 5.2 原因层（展开 Strip）

- 三人格各 **一行** verdict（沿用 `PersonaCard` 文案规范，不展示 Sub-Agent 名）
- `running` 时：`PlanningPipelineProgress`（非 compact）
- 最近一次编排 **完成时间** + `request_id`（复制，供排障）
- 链接：「在助手中继续」→ 聚焦 `AgentChatSidebar`

### 5.3 主 CTA 路由表

| 条件 | 主按钮文案 | 行为 |
|------|------------|------|
| `segment_editor_mode === topology_locked` | 微调时间 | 滚动 ScheduleTab + 高亮时间编辑提示 |
| guards 建议 optimize / `suggested_operations` 含 optimize | 一键优化 | `invokeRouteAndRun` optimize intent |
| `NEED_CONFIRMATION` | 确认并继续 | 打开 `NegotiationDialog` 或侧边栏确认流 |
| `NEED_MORE_INFO` | 补充信息 | 聚焦侧边栏 + 预填澄清 |
| Gate BLOCK | 调整方案 | 侧边栏发送「请修复 BLOCK 项」或打开 Feasibility Sheet |
| 默认 | 打开助手 | 展开 `AgentChatSidebar` |

### 5.4 数据层

- 「查看依据」→ 打开 `EvidenceDrawer`，默认 Tab = `decision`
- 数据：`tripsApi.getDecisionLog` + 当前会话 `explain.decision_log` 合并（与 `mergeRouteRunDecisionLogs` 同逻辑）

### 5.5 与现有组件关系

| 组件 | M1 处理 |
|------|---------|
| `PlanningBanner` | Strip 有结论时 **隐藏 Banner**，避免双横幅；无结论时 Banner 照常 |
| `DecisionCockpitPanel` | 默认 **折叠**；`?decisionCockpit=1` 深链仍展开 |
| `PipelineStatusIndicator` | **保留**在顶栏，不与 Strip 合并 |
| `PlanningWorkbenchTab` | **不**恢复 Tab；M2 迁移其读模型到 Strip |

---

## 6. 数据与接口

### 6.1 M1 读模型（无新接口）

```typescript
// 伪代码：Strip 数据选择器
function useDecisionStripModel(tripId: string) {
  const guards = useWorldModelGuardsStore(s => s.worldModelGuards);
  const explainOpt = useWorldModelGuardsStore(s => s.explainOptimization);
  const cockpit = useWorldModelGuardsStore(s => s.decisionCockpit);
  const task = usePlanningTaskStore(); // message, currentPhase, progressPercentage
  const lastRouteRun = useLastRouteRunForTrip(tripId); // 会话内缓存，Agent 写入
  // ...
}
```

**写入时机**：凡 `invokeRouteAndRun` / `handleRouteAndRunResponse` 成功且带 `trip_id`，更新 `worldModelGuardsStore` + `lastRouteRun`（已有逻辑，Strip 只读）。

### 6.2 M2 读模型增强

| 能力 | 接口 | 说明 |
|------|------|------|
| 历史决策 | `GET /trips/:id/decision-log` | Strip 展开 / Drawer 列表 |
| 异步进度 | `GET /agent/task/status/:id` | 统一进度真源 |
| 业务里程碑 | `GET /trips/:id/pipeline-status` | 仅顶栏，不进 Strip |

### 6.3 写操作（全部走 Agent）

Strip **不**直接调用 `planning-workbench/execute`、`/decision/*`。所有写操作经主 CTA → `route_and_run` 或现有 Dialog。

---

## 7. 分期交付

### M1 — 决策条只读（建议 1 周）

**范围**

- 新增 `DecisionStrip` 组件，嵌入 `src/pages/plan-studio/index.tsx`
- 读 `worldModelGuardsStore` + `planningTaskStore` + 会话内 last route run
- 主 CTA 路由表实现 3 条：`打开助手`、`一键优化`（若已有 suggested op）、`微调时间`（topology lock）
- `PlanningBanner` 与 Strip 互斥展示
- 移动端：Strip 折叠为单行结论 + chevron

**验收标准**

- [ ] 有 guards 的行程进入 Plan Studio，3s 内看到结论 + 1 个主按钮
- [ ] 异步规划进行中，Strip 展示真实 `PlanningPipelineProgress`（来自 store）
- [ ] 无 guards 且无 task 时，展示 idle 态，不空白
- [ ] 顶栏 Pipeline 与 Strip 编排进度 **不同屏强展示**（running 时 Strip 内才有七步）
- [ ] a11y：`role="status"`、`aria-live="polite"` 于 running / conclusion 切换

### M2 — 进度真源 + 写链收敛（建议 1–2 周）

**范围**

- `AutoOptimizeDialog`、`ScheduleTab` 改排触发的进度 **统一** 写入 `planningTaskStore`
- 删除 `PlanningWorkbenchTab` 内假进度 `setInterval`
- `CurrentTripDecisionCard`、`ContinueEditingCard` 摘要改为 `trips/decision-log`（或 explain 投影）
- Strip 展开层接入 `getDecisionLog`

**验收标准**

- [ ] 全站无「随机 +10%」假进度（grep 验收）
- [ ] Dashboard 卡片与 Plan Studio Strip 对同一 trip 结论 **一致**（人工抽检 5 条）
- [ ] `planning-workbench/execute` 无 **新增** C 端调用点

### M3 — 跨入口一致（可与接口 sunset 并行）

- Feasibility Sheet 顶部摘要与 Strip 同源
- Active Trip 复盘接 `decision-replay` 读模型
- 埋点看板：§2.3 指标

---

## 8. 组件与文件（前端）

| 项 | 路径 |
|----|------|
| 新组件 | `src/components/plan-studio/DecisionStrip.tsx` |
| 数据 hook | `src/hooks/useDecisionStripModel.ts` |
| 嵌入页 | `src/pages/plan-studio/index.tsx` |
| 复用 | `PlanningPipelineProgress`、`PlanningBanner` 文案函数、`EvidenceDrawer` |
| Store | `worldModelGuardsStore`、`planningTaskStore` |
| i18n | `src/locales/zh/translation.json` — `planStudio.decisionStrip.*` |

---

## 9. 设计要点

- 视觉权重 **低于** Tab 内容区、**高于** 普通 Alert；与 `PlanningBanner` 同 family，避免第三套样式
- 主按钮 **filled** 仅 1 个；「查看依据」为 ghost / link
- 三人格仅 emoji/头像 + 一行，**禁止** Sub-Agent 名称
- 评分若展示：单一数字（交互哲学 PRD），子维度进 Drawer

---

## 10. 埋点

| 事件 | 属性 |
|------|------|
| `decision_strip_impression` | `trip_id`, `strip_state`, `has_guards` |
| `decision_strip_primary_cta` | `trip_id`, `cta_type`, `strip_state` |
| `decision_strip_expand` | `trip_id`, `expanded` |
| `decision_strip_evidence_open` | `trip_id`, `source`（strip / drawer） |

---

## 11. 风险与依赖

| 风险 | 缓解 |
|------|------|
| 无 `route_and_run` 历史时 Strip 空 | idle 态 + 引导助手 |
| guards 与 decision-log 不一致 | M2 以前端 merge 规则为准；后端对齐见 audit matrix |
| 与预算四层 PRD 门控重复 | 预算结论进 Gate_EVAL 步骤文案，Strip 不单独拉 budget API |
| 团队误恢复 workbench Tab | PRD 非目标写死；评审签批 |

**后端依赖（M1 可并行确认）**

1. `explain.decision_log[].outputs_summary` 稳定供摘要
2. async task 的 `current_phase` 与编排枚举一致

---

## 12. 评审签批

| 角色 | 签批 | 日期 |
|------|------|------|
| 产品 | | |
| 设计 | | |
| 前端 | | |
| 后端 | | |

**签批问题（必答）**

1. M1 是否批准无新接口只读上线？
2. 预算 Gate 结论是否并入 Strip 摘要（vs 独立预算 Tab）？
3. `DecisionCockpitPanel` 是否 M1 默认隐藏？

---

## 13. 附录：与旧方案对比

| 方案 | 结论 |
|------|------|
| 恢复 `workbench` Tab | ❌ AI 控制台，违背交互哲学 |
| 仅加强 Agent 侧边栏 | ❌ 主区仍非 AI native |
| Decision Strip + 接口收敛 | ✅ 最小正确步 |
