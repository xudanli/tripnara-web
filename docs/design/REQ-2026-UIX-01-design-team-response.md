# REQ-2026-UIX-01 设计专家组评审意见

**文档类型**：设计评审纪要 · 战略对齐  
**版本**：1.0.0  
**状态**：已共识，指导后续 PRD 修订  
**关联研究**：REQ-2026-UIX-01《AI 原生旅行决策平台 · 界面形态前沿研究报告》  
**关联产品文档**：
- `docs/tripnara-interaction-philosophy-prd.md`
- `docs/prd/plan-studio-decision-strip-prd.md`
- `docs/tripnara-future-interaction-vision.md`
- `docs/ux-evaluation-conversation-first-architecture.md`
- `docs/api/persona-alerts-bff-contract.md`

**编制**：交互架构 · 决策 UX · 视觉 · 协同设计 · 技术 UX（五人专家组）  
**最后更新**：2026-06-27

---

## 执行摘要

设计专家组对 REQ-2026-UIX-01 研究报告形成以下共识：

1. **方向正确**：报告识别的「约束卡片 + 实时方案矩阵 + 松弛对话」混合架构，与 TripNARA 正在落地的 Decision Strip、PlanningConstraintsCard、PlanningConflictsPanel 高度重合，是对内部路线的**外部验证**。
2. **需校准合并**：报告强调决策透明化（Palantir / DESDEO），与交互哲学 PRD 的「单决策 / 默认只显示结论」存在张力——须以**三层渐进揭示**合并，而非二选一。
3. **修正对话优先**：2026-01「对话即主界面」方案应修订为「对话 = 意图入口 + 松弛协商；结构化界面 = 约束 + 对比 + 信任」。
4. **Phase 1 立即采纳**；Phase 3 多人 AI 调解保持 roadmap，不阻塞 MVP。

**一句话定位**：TripNARA 不做「更好用的 Layla」，而做「旅行领域的 DESDEO + Palantir Vertex」——约束与方案矩阵承载决策计算，对话承载意图与松弛，三人格承载信任。

---

## 1. 与现有产品资产的对照

| 报告建议（REQ-2026-UIX-01 §6.1） | TripNARA 现状 | 差距 |
|----------------------------------|---------------|------|
| 约束卡片 Constraint Card | `PlanningConstraintsCard` | 缺弹性度标注、拖拽排序 |
| 实时方案矩阵 Live Solution Matrix | `DecisionMatrixCard`（适合度单结论） | 缺 2–3 方案并行、差值高亮、实时重排 |
| 松弛建议对话框 Relaxation Dialog | `PlanningConflictsPanel` | 缺 Goal Seek 式「最小调整量」文案 |
| 决策路径可视化 Decision Trail | Decision Strip 展开层 + EvidenceDrawer | 缺消除漏斗可视化 |
| 差值高亮对比 Diff Highlight | 未系统化 | M2 目标 |
| 反事实预览 What-If Panel | 已移除非目标 Tab | M3 / 侧边栏轻量版 |
| 多人偏好热力图 Group Heatmap | `TeamPreferenceSummary`（只读聚合） | 无冲突可视化、无 AI 调解 |
| 共识进度条 Consensus Bar | 无 | Phase 3 |

---

## 2. 五位专家分项意见

### 2.1 交互架构师（IA）

**结论**：报告帮助我们「从对话优先退半步」——这是正确方向。

| 维度 | 2026-01 方案 | 修订后立场 |
|------|-------------|-----------|
| 主界面 | 对话即一切 | 对话 = 入口；Plan Studio 主区 = 决策条 + 结构化编辑 |
| Agent 侧边栏 | 完成所有操作 | 多轮澄清 + 松弛协商；不替代约束/矩阵 |
| 导航 | 9 入口 → 任务驱动 | 保持；Decision Strip 作为规划页单决策入口 |

**采纳报告概念**：Ephemeral Interface（瞬时界面）——约束调整触发的方案对比面板，用户选定后收起，不占持久 Chrome。

**需修订文档**：`docs/tripnara-future-interaction-vision.md` §「方案 A：对话优先架构」应加注「2026-06 修订：混合架构，见本纪要」。

### 2.2 决策 UX 设计师

**结论**：报告最强贡献是「约束-方案动态耦合」——TripNARA 最大差异化所在。

Layla 被批评的弱点（thin for harder trips、无 visible elimination funnels、无 deep trade-off analysis）正是 TripNARA 应正面回答的设计空间。

**核心交互三角（Plan Studio）**：

```
┌─────────────────┬──────────────────────────┐
│  约束卡片面板    │   实时方案矩阵            │
│  (可调、可排序)  │   (≤3 方案，差值高亮)     │
├─────────────────┴──────────────────────────┤
│  松弛建议条（冲突时出现，非永久占屏）          │
└────────────────────────────────────────────┘
         ↑ Decision Strip 结论层压顶 ↑
```

**与交互哲学 PRD 的合并规则**：

| 层级 | 用户看到 | 报告模式映射 |
|------|----------|-------------|
| 默认（3 秒） | 一句结论 + 1 主 CTA | Strip 结论层 |
| 展开 | 三人格一行 + 方案矩阵摘要 + 差值 | 模式 2、5 |
| 审计 | 决策路径、消除漏斗、编排七步 | 模式 4；Palantir 数据→逻辑→行动 |
| 专家 | reason codes、Solver 轨迹 | 不对 C 端默认暴露 |

**反模式警示（报告 §7）**：禁止静默降级（约束不可解却返回近似解而不告知）；禁止选择过载（>7 方案）；禁止单点信任（无元数据的高置信排版）。

### 2.3 视觉 / 生成式 UI 设计师

**结论**：Phase 1 不追求 LLM 动态生成 JSX；采用「声明式组件库 + Agent 工具触发渲染」。

| 优先级 | 做法 | 来源 |
|--------|------|------|
| P0 | 预定义 React 组件（约束卡、矩阵、松弛条） | CopilotKit 静态 UI 模式 |
| P1 | Governors：Action Plan、Variations、Verification Gate | Shapeof.ai |
| P2 | 真·生成式 UI（A2UI / MCP Apps） | 待组件库稳定后 |

**自信外观陷阱**：`DecisionMatrixCard` 等决策组件须配套置信度指示器 + Caveat（局限性说明），避免精美 UI 掩盖不确定性。

### 2.4 协同 / 社会设计专家

**结论**：报告 §4 识别的「多人 AI 调解空白」属实；`TeamPreferenceSummary` 仅为 M0 只读参考。

**渐进路线**：

| 阶段 | 能力 | 参考 |
|------|------|------|
| M1 | 各自约束可见 + 冲突高亮 | 模式 7 简化版 |
| M2 | 「只需将预算 +¥2,000 或推迟 3 天即可全员满意」 | Praxa Goal Seek |
| M3 | 共识进度条 + AI 魔鬼代言人 | deliberation.io |

**IA 决策**：多人协商状态应**嵌入 Decision Strip**（`strip_state: needs_consensus`），而非独立协商控制台 Tab。

### 2.5 技术 UX / 性能设计师

**结论**：报告 5.1 混合架构判断准确；前端须配合快慢路径。

| 路径 | 延迟目标 | 行为 |
|------|----------|------|
| 快路径 | <800ms | 约束滑动 → 前端 diff 重排矩阵（过滤/排序） |
| 慢路径 | 2–5s 流式 | `route_and_run` → Strip running + 七步进度 |
| 禁止 | — | Workbench 假进度（P0 消除） |

Stream of Thought **默认折叠**；用户展开「查看计算过程」时展示，符合渐进揭示。

---

## 3. 战略建议采纳清单

### 3.1 完全采纳

- [x] 混合界面架构，拒绝纯对话万能论
- [x] 约束-方案矩阵作为核心差异化（非「AI 旅行聊天」）
- [x] 三层渐进揭示合并透明化需求（结论 / 原因 / 数据）
- [x] 方案数量上限 ≤3（Top + 替代），防选择过载
- [x] LLM 负责解释，Solver 负责计算（混合编排）
- [x] C 端 BFF 人话投影（`persona-alerts` 契约）与透明化分层一致

### 3.2 有条件采纳

| 建议 | 条件 |
|------|------|
| Palantir 式全链路透明 | 仅 B 端顾问 / 专家模式；C 端默认折叠 |
| DESDEO 灵敏度分析 | M2 起，作为矩阵列「拖动偏好权重」的简化版 |
| 生成式 UI | Phase 2 后，组件库稳定再评估 |
| 反事实 What-If 面板 | M3；M1 可用 Agent 侧边栏对话替代 |

### 3.3 报告需补充（TripNARA 视角）

1. **移动端**：约束矩阵退化为单卡滑动对比 + 对话松弛
2. **情感决策**：三人格（Abu / Neptune / Narrator）应纳入透明化框架，非仅理性多目标
3. **受众分层**：C 端人话 vs B 端审计链路须分规格
4. **竞品走查**：报告 §9 承认缺 Heuristic Walkthrough——需补 Layla / Wanderlog / Mindtrip / Google Flights AI Deals

---

## 4. 与历史文档的冲突消解

| 冲突点 | 文档 A | 文档 B | 决议 |
|--------|--------|--------|------|
| 对话 vs 结构化 | future-interaction-vision：对话优先 | REQ-2026-UIX-01：反纯对话 | **混合**；修订 vision 文档 |
| 透明 vs 简洁 | 报告：数据→逻辑→行动 | 交互哲学：默认只结论 | **三层渐进揭示** |
| Tab 恢复 | 旧 workbench / what-if Tab | Decision Strip PRD 非目标 | **不恢复 Tab**；能力并入 Strip + 展开层 |
| 团队协商 | 报告：独立协同层 | Strip PRD：非目标多 Tab 控制台 | **Strip 状态机扩展**，非新 Tab |

---

## 5. 行动项

| 优先级 | 动作 | 产出 | 周期 |
|--------|------|------|------|
| P0 | Decision Strip PRD v0.2 增补「约束-方案矩阵」 | `docs/prd/plan-studio-decision-strip-prd-v0.2-supplement.md` | 已完成 |
| P0 | 修订 future-interaction-vision 对话优先表述 | 文档 PR | 3 天 |
| P0 | Plan Studio 交互规范：对话 vs 结构化边界 | `docs/design/plan-studio-interaction-boundary.md` | 已完成 |
| P1 | 方案矩阵 MVP（2–3 方案 + 差值高亮） | `SolutionMatrixPanel` M1.5 骨架已落地 | 进行中 |
| P1 | 松弛条 BFF 对接 | `RelaxationSuggestionBar` + clarification 提交 | 已完成 |
| P2 | 团队偏好冲突热力图概念稿 | Figma | 6 周 |
| P2 | 竞品 Heuristic Walkthrough（5 产品 × 8 模式） | REQ-2026-UIX-01 v1.1 附录 | 2 周 |

---

## 6. 评审签批

| 角色 | 签批 | 日期 |
|------|------|------|
| 交互架构 | | |
| 决策 UX | | |
| 视觉设计 | | |
| 协同设计 | | |
| 技术 UX | | |
| 产品 | | |

**必答问题**

1. 是否批准「混合架构」取代「对话优先」作为官方 IA 立场？
2. M2 方案矩阵是否限制最多 3 个可见方案？
3. 多人协商是否仅通过 Strip 状态扩展，不新增 Tab？

---

## 7. 附录：报告模式 → TripNARA 组件映射

| # | 模式 | 目标组件 / 模块 | 分期 |
|---|------|-----------------|------|
| 1 | 约束卡片 | `PlanningConstraintsCard` | M1 增强 |
| 2 | 实时方案矩阵 | `SolutionMatrixPanel`（新） | M2 |
| 3 | 松弛建议 | `PlanningConflictsPanel` + Strip 底栏 | M2 |
| 4 | 决策路径 | Strip 展开 + EvidenceDrawer | M1/M2 |
| 5 | 差值高亮 | `SolutionMatrixPanel` | M2 |
| 6 | 反事实预览 | Agent 对话 M1；侧面板 M3 | M3 |
| 7 | 多人偏好热力图 | Team Tab 升级 | M3 |
| 8 | 共识进度条 | Decision Strip `needs_consensus` | M3 |
