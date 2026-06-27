# Plan Studio 决策条 PRD v0.2 增补：约束-方案矩阵

**文档类型**：PRD 增补章节 · 挂接 v0.1.0 主文档  
**版本**：0.2.0-supplement  
**状态**：待评审  
**主文档**：`docs/prd/plan-studio-decision-strip-prd.md`（v0.1.0）  
**设计评审**：`docs/design/REQ-2026-UIX-01-design-team-response.md`  
**研究来源**：REQ-2026-UIX-01 §2、§3、§6、§8  

**最后更新**：2026-06-27

---

## 修订说明

v0.2 在 v0.1 Decision Strip（单决策入口 + 三层渐进揭示）基础上，增补 **约束-方案动态耦合** 交互层。不恢复 `workbench` / `what-if` Tab；能力嵌入 Plan Studio 主区，与 Decision Strip 垂直堆叠。

**v0.1 → v0.2 关系**：

```
v0.1 Decision Strip     = 结论层（现在情况如何？下一步做什么？）
v0.2 约束-方案矩阵       = 原因层 + 部分数据层（为什么？还有哪些选择？）
```

---

## 14. 背景与目标（v0.2 增补）

### 14.1 问题

v0.1 Strip 解决了「3 秒看到结论」，但未解决：

- 用户**看不到**约束如何影响方案（无 visible elimination funnels）
- 多方案对比依赖 Agent 侧边栏对话，**主区仍是 CRUD 编辑器**
- 约束冲突时 `PlanningConflictsPanel` 与 Strip **脱节**，无 Goal Seek 式最小松弛建议

### 14.2 目标

| 目标 | 说明 | 成功信号 |
|------|------|----------|
| **约束可见** | 每个活跃约束以卡片呈现，含类型、值、状态 | 用户能指出「哪条约束导致 BLOCK」 |
| **方案可比** | 同时展示 ≤3 个候选方案，差值高亮 | 用户无需打开侧边栏即可选方案 |
| **冲突可解** | 不可解时展示松弛建议条，非静默降级 | 用户知道冲突存在 + 最小调整路径 |
| **与 Strip 一体** | 矩阵不抢 Strip 主 CTA；冲突时 Strip 态切换 | 首屏仍 1 结论 + 1 按钮 |

### 14.3 非目标（v0.2 不做）

- ❌ 完整 DESDEO 式多目标空间投影（M3+ 研究项）
- ❌ LLM 动态生成 UI 组件（采用预定义 React 组件）
- ❌ 恢复独立 What-If Tab（反事实 M3 经 Agent 或折叠面板）
- ❌ 多人热力图 / 共识进度条（见 §20 Phase 3）
- ❌ 新 REST 写链——写操作仍走 `route_and_run`

---

## 15. 信息架构（v0.2 修订）

### 15.1 页面结构

```
┌─ 顶栏：标题 · 业务 Pipeline · 工具按钮 ─────────────────────┐
├─ ★ Decision Strip（v0.1，结论 + 主 CTA）─────────────────────┤
├─ ★ 约束-方案区（v0.2 新增）─────────────────────────────────┤
│   ┌─ 约束卡片带 ─┐  ┌─ 方案矩阵（≤3 列）─────────────────┐  │
│   │ Planning     │  │ SolutionMatrixPanel                  │  │
│   │ Constraints  │  │ 行=评估维度 · 列=方案 · 差值高亮    │  │
│   │ Card         │  └──────────────────────────────────────┘  │
│   └──────────────┘                                           │
├─ ★ 松弛建议条（冲突时出现，贴矩阵底）─────────────────────────┤
├─ Tabs：日程 | 预算 | 行前 | 团队 ─────────────────────────────┤
│   主内容区（ScheduleTab 等，不变）                            │
└──────────────────────────────────────────────────────────────┘
│ AgentChatSidebar（意图入口 + 深度松弛对话）                   │
```

### 15.2 与 PlanningConstraintsCard 关系

| 场景 | 行为 |
|------|------|
| 桌面 ≥1024px | 约束卡片带与方案矩阵 **左右并列**（约 32% / 68%） |
| 平板 / 移动 | 约束卡片 **可折叠顶栏**；矩阵退化为 **方案卡片栈**（左右滑对比） |
| 有 planning inbox | 约束卡默认收起（沿用 `deferToPlanningInbox`） |
| 约束变更 | 触发快路径重排；重大变更触发 `route_and_run` 慢路径 |

---

## 16. 约束卡片带（模式 1 增强）

### 16.1 卡片字段

在现有 `PlanningConstraintsSummary` 基础上，每张约束卡展示：

| 字段 | 示例 | 数据源 |
|------|------|--------|
| 类型 icon | 预算 / 日期 / 同行者 / 节奏 | `planning-constraints` |
| 当前值 | ¥80,000 · 10 天 · 4 人 | 同上 |
| 状态 | 已确认 / 待确认 / 冲突 | `status` + `PlanningConflictsPanel` |
| 弹性度（M2） | 硬 / 软 / 可协商 | 用户标注或 Agent 推断，默认「硬」 |
| 影响指示（M2） | 「影响 2 个方案」 | 矩阵 diff 计数 |

### 16.2 交互

| 操作 | 行为 | 路径 |
|------|------|------|
| 点击编辑 | 打开现有 Dialog（预算/日期/旅行者） | 已有 |
| 标记弹性度 | 循环 硬→软→可协商 | M2 |
| 拖拽排序（M2） | 优先级影响矩阵默认排序维度 | 可选 |
| 点击冲突 badge | 滚动至松弛建议条 + Strip `blocked` 态 | v0.2 |

### 16.3 约束变更 → 矩阵更新

```
用户修改约束
    │
    ├─ 轻量（预算 ±10%、日期 ±1 天）→ 快路径：前端重算矩阵排序/过滤（<800ms）
    │
    └─ 结构性（目的地、天数 ±30%、人数变更）→ 慢路径：Strip running + route_and_run
```

---

## 17. 实时方案矩阵（模式 2 + 5）

### 17.1 组件：`SolutionMatrixPanel`

**路径**：`src/components/plan-studio/SolutionMatrixPanel.tsx`

### 17.2 布局规则

| 规则 | 规格 |
|------|------|
| 方案列数 | **最多 3**（推荐 / 替代 A / 替代 B）；不足时隐藏列 |
| 行（评估维度） | 预算、节奏、风险、体验、可行性（Gate）、综合评分 |
| 默认可见行 | **3 行**（综合评分 + 用户上次关注维度 + 当前冲突相关维度） |
| 展开 | 「查看全部维度」+ 折叠相同项 |
| 差值高亮 | 列间不同单元格背景色：改善=绿、恶化=红、相同=灰/折叠 |
| 选中态 | 用户点击列头 → 设为「当前方案」→ Strip 结论层同步 |

### 17.3 文字原型（桌面）

```
方案矩阵                          [ 查看全部维度 ⌄ ]
              │ ★ 推荐方案    │  替代 A       │  替代 B
──────────────┼───────────────┼───────────────┼──────────────
综合评分      │  92           │  85           │  78
预算          │  ¥78,000      │  ¥72,000 ▼    │  ¥68,000 ▼
Abu 风险      │  低           │  低           │  中 ▲
节奏          │  标准         │  悠闲 ▼       │  紧凑 ▲
──────────────┴───────────────┴───────────────┴──────────────
                        [ 采用推荐方案 ]  ← 与 Strip 主 CTA 同源，不得双主按钮
```

**硬规则**：矩阵内 **不得** 出现第二个 filled 主按钮；「采用方案」与 Strip 主 CTA **合并为同一动作**（矩阵列选中后 Strip CTA 文案变为「采用 [方案名]」）。

### 17.4 数据来源（M2 读模型）

| 字段 | 优先数据源 | 降级 |
|------|-----------|------|
| 方案列表 | `explain.alternatives` / Neptune 替代方案 | 单次 `route_and_run` 结果 + 历史 decision-log |
| 维度分值 | `explain.optimization.dimensions` | readiness / guards 投影 |
| 差值 | 前端 `computeSolutionDiff(base, alt)` | — |
| 置信度 | `explain.confidence` / persona-alerts severity | 隐藏列或显示 ⚠ |

**M2 之前（M1.5）**：矩阵可只展示 **1 列（当前方案）+ 1 列（Neptune 替代）**，验证差值 UI 后再扩三列。

### 17.5 与 DecisionMatrixCard 关系

- `DecisionMatrixCard`（适合度 GO/NO-GO）保留于 **行程创建流 / Gate 结论** 场景
- Plan Studio 内由 `SolutionMatrixPanel` **替代** Cockpit 内的矩阵展示
- 两者共用 `DecisionResult` 类型子集，避免双份映射逻辑 → 提取 `src/lib/solution-matrix-model.ts`

---

## 18. 松弛建议条（模式 3）

### 18.1 触发条件

| 条件 | Strip 态 | 松弛条 |
|------|----------|--------|
| `PlanningConflictsPanel` 有 unresolved 项 | `blocked` | 显示 |
| Gate BLOCK + 可修复 | `blocked` | 显示 Goal Seek 文案 |
| 全部约束可满足 | `conclusion` | 隐藏 |
| 静默近似解（后端 flag） | **禁止** → 强制 `blocked` + 文案 | 显示 |

### 18.2 布局

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ 当前约束无法同时满足                                       │
│ 建议：将预算上限调整为 ¥82,000（+¥2,000），或出发日推迟 3 天    │
│ [ 接受预算调整 ]  [ 接受日期调整 ]  [ 在助手中讨论 ]            │
└─────────────────────────────────────────────────────────────┘
```

### 18.3 文案规范（Goal Seek）

后端 / Agent 返回结构化松弛项时，BFF 或前端模板渲染：

```typescript
interface RelaxationSuggestion {
  constraintId: string;
  constraintLabel: string;      // 「预算上限」
  currentValue: string;         // 「¥80,000」
  suggestedValue: string;       // 「¥82,000」
  deltaLabel: string;           // 「+¥2,000」
  satisfiesRemaining: string[]; // 接受后仍满足的约束 id
}
```

**人话模板**：`只需将{constraintLabel}调整为{suggestedValue}（{deltaLabel}），即可满足其余 {n} 项约束。`

### 18.4 交互

| 按钮 | 行为 |
|------|------|
| 接受调整 X | 写约束 → 快/慢路径重算 → 隐藏松弛条 |
| 在助手中讨论 | 聚焦 AgentChatSidebar + 预填松弛上下文 |
| -dismiss | 不允许无操作 dismiss；须「稍后处理」进 planning inbox |

---

## 19. Strip 状态机扩展（v0.2）

在 v0.1 §4.2 基础上新增：

| 状态 | 触发 | Strip 展示 | 矩阵 / 松弛条 |
|------|------|-----------|--------------|
| `comparing` | 用户展开矩阵或 ≥2 方案可用 | 结论 + 「采用 [所选方案]」 | 矩阵全展示 |
| `needs_consensus` | 团队约束冲突（Phase 3） | 「团队存在 N 处分歧」 | 热力图简化版 |

**v0.2 仅实现 `comparing`**；`needs_consensus` 见 §20。

### 19.1 渐进揭示对齐（修订 §3.3）

```
结论层（Strip 默认）
    ↓ 用户点击「查看方案对比」或存在 ≥2 方案
原因层（Strip 展开 + 矩阵摘要 3 行）
    ↓ 用户展开矩阵 / 「查看全部维度」
数据层（完整矩阵 + EvidenceDrawer + 决策路径）
```

---

## 20. 分期交付（v0.2 修订）

### M1.5 — 双列矩阵 MVP（2 周，接 v0.1 之后）

- [x] `SolutionMatrixPanel`：2 列（当前 + Neptune 替代）
- [x] 差值高亮 3 个核心维度（预算、风险、节奏）
- [x] 列选中 ↔ Strip 主 CTA 联动
- [x] 矩阵折叠默认 **收起**（仅 Strip 结论可见，防认知过载）

### M2 — 三列矩阵 + 松弛条（4–6 周，部分已落地 2026-06-27）

- [x] Strip CTA ↔ 矩阵选中列文案联动（`resolveCompareStripCtaLabel`）
- [x] 约束轻量变更快路径 refreshing（budget / transport，800ms）
- [x] `explain.alternatives[]` / `relaxation_suggestions[]` 解析与 BFF 契约草案
- [x] `RelaxationSuggestionBar` 接入 BFF v1（`relaxation_suggestions[]` + clarification 提交）
- [ ] 第三列替代方案（依赖后端 options≥3；前端已支持 ≤3 列截断 + 助手入口）
- [x] 约束卡弹性度标注 + 矩阵影响指示
- [ ] 松弛「接受」直写约束 API（当前经 clarification_answers → route_and_run）
- [x] `DecisionCockpitPanel` 矩阵部分下线（与矩阵/compare/松弛互斥；`?decisionCockpit=1` 深链保留）

### M3 — 反事实 + 协同（12–18 月，与 REQ-2026-UIX-01 Phase 3 对齐）

- [ ] What-If 侧面板（修改假设 → 矩阵列预览）
- [ ] Strip `needs_consensus` + 团队偏好热力图
- [ ] 共识进度条

---

## 21. 组件与文件（v0.2 新增）

| 项 | 路径 |
|----|------|
| 方案矩阵 | `src/components/plan-studio/SolutionMatrixPanel.tsx` |
| 松弛建议条 | `src/components/plan-studio/RelaxationSuggestionBar.tsx` |
| 读模型 | `src/lib/solution-matrix-model.ts` |
| Hook | `src/hooks/useSolutionMatrixModel.ts` |
| 差值计算 | `src/lib/solution-diff.util.ts` |
| 影响指示 | `src/lib/constraint-matrix-impact.util.ts` |
| 埋点 | `src/utils/plan-studio-solution-matrix-analytics.ts`, `plan-studio-relaxation-analytics.ts` |
| 测试 | `src/lib/solution-matrix-model.test.ts` |
| i18n | `planStudio.solutionMatrix.*`, `planStudio.relaxation.*` |

**复用**：`PlanningConstraintsCard`、`PlanningConflictsPanel`、`DecisionStrip`、`useDecisionStripModel`

---

## 22. 设计要点

- 矩阵视觉权重 **低于** Strip、**高于** Tab 内容——用户先决策、再编辑日程
- 差值颜色使用现有 gate token（`gate-allow-*` / `gate-block-*`），不引入第三套色板
- 移动端矩阵：**禁止** 横向滚动宽表；改用 `SolutionCompareCarousel`（卡片栈 + 维度 pill）
- 每个方案列须带 **Caveat 一行**（如「Day3 天气不确定」）——防自信外观陷阱
- 无数据时显示 skeleton，**禁止** 空矩阵占位

---

## 23. 埋点（v0.2 增补）

| 事件 | 属性 |
|------|------|
| `solution_matrix_impression` | `trip_id`, `column_count`, `collapsed` |
| `solution_matrix_column_select` | `trip_id`, `column_index`, `plan_id` |
| `solution_matrix_expand_dimensions` | `trip_id` |
| `relaxation_bar_impression` | `trip_id`, `suggestion_count` |
| `relaxation_bar_accept` | `trip_id`, `constraint_id`, `suggestion_type` |

---

## 24. 风险与依赖

| 风险 | 缓解 |
|------|------|
| 后端无 structured alternatives | M1.5 仅 2 列；从 Neptune narrative 解析 |
| 矩阵与 Strip 双主按钮 | 规格写死：矩阵无 filled CTA |
| 移动端认知过载 | 默认折叠矩阵；对话松弛为主 |
| 快路径与 guards 不一致 | 慢路径完成后强制刷新；显示「正在重新评估」 |
| 与预算四层 PRD 重复 | 预算维度进矩阵一行，不另开预算对比 Tab |

**后端依赖（M2）**

1. `explain.alternatives[]` 稳定 schema（plan_id, label, dimension_scores, caveats）
2. `relaxation_suggestions[]` 于 GATE_EVAL / VERIFY 阶段输出

---

## 25. 验收标准（v0.2）

- [ ] 有 ≥2 方案时，用户 **不打开侧边栏** 可完成方案选择（可用性测试 ≥70%）
- [ ] 约束冲突时 **零** 静默近似解（人工用例 10 条）
- [x] 矩阵可见方案 **≤3**，超过时 UI 截断 + 「在助手中查看更多」
- [x] Strip 主 CTA 与矩阵选中 **始终单一**（`resolveCompareStripCtaLabel` + 矩阵无 filled CTA）
- [x] 约束轻量变更后 800ms 内矩阵有反馈（skeleton refreshing）

---

## 26. 评审签批（v0.2 增补）

| 角色 | 签批 | 日期 |
|------|------|------|
| 产品 | | |
| 设计 | | |
| 前端 | | |
| 后端 | | |

**必答问题**

1. M1.5 是否批准矩阵默认折叠、仅 Strip 结论首屏可见？
2. `explain.alternatives` schema 由谁 owner（后端 RFC 截止日）？
3. 松弛建议「接受」是否直接写约束 API，还是必须经 `route_and_run`？

### 评审决议（草案 · 2026-06-27）

| # | 决议 | 说明 |
|---|------|------|
| 1 | **批准** | 矩阵默认折叠；Strip「查看方案对比」展开矩阵并打开 Plan Gate Drawer |
| 2 | **后端 owner** | 对齐 `OptionComparison` / `explain.alternatives[]`；RFC 截止 **2026-07-15** |
| 3 | **经约束 API + route_and_run** | 接受松弛先写约束读模型，再触发 `route_and_run` 重算；禁止仅前端改显示 |

---

## 27. 附录：REQ-2026-UIX-01 模式对照

| 报告模式 | 本章 |
|---------|------|
| 1 约束卡片 | §16 |
| 2 实时方案矩阵 | §17 |
| 3 松弛建议对话框 | §18 |
| 4 决策路径可视化 | §19.1 数据层 → EvidenceDrawer（v0.1 §5.4） |
| 5 差值高亮对比 | §17.2 |
| 6 反事实预览 | §20 M3 |
| 7–8 多人协同 | §20 M3 |
