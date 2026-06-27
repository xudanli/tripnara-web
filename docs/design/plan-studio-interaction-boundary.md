# Plan Studio 交互边界：对话 vs 结构化

**文档类型**：设计规范 · IA 边界  
**版本**：1.0.0  
**状态**：已采纳（2026-06-27）  
**关联文档**：
- `docs/design/REQ-2026-UIX-01-design-team-response.md`
- `docs/tripnara-interaction-philosophy-prd.md`
- `docs/prd/plan-studio-decision-strip-prd-v0.2-supplement.md`
- `docs/tripnara-future-interaction-vision.md`（需加注修订说明）

**最后更新**：2026-06-27

---

## 1. 目的

明确 TripNARA Plan Studio 中 **对话（Agent）** 与 **结构化界面（约束 / 矩阵 / 编辑）** 的职责边界，避免：

- 纯对话承载复杂约束与多方案对比（报告反模式 #1）
- 结构化界面重复 Agent 已完成的澄清轮次
- 双主按钮、双进度、双结论来源

---

## 2. 官方立场（2026-06 修订）

> **对话 = 意图入口 + 松弛协商 + 深度解释**  
> **结构化界面 = 约束管理 + 方案对比 + 日程编辑 + 信任元数据**

取代 2026-01「对话即主界面」方案；对话 **不是** Plan Studio 的唯一交互面。

---

## 3. 能力分配矩阵

| 用户意图 | 首选界面 | 次选 / 降级 | 禁止 |
|---------|---------|------------|------|
| NEED_MORE_INFO 松弛澄清 | `relaxation_suggestions[]` → RelaxationSuggestionBar / AgentRelaxationSuggestionsCard | — | 解析 clarificationQuestions.options 机器 label |
| 描述旅行需求、改目的地 | Agent 侧边栏 | 创建流 NL 入口 | 约束卡片内长文本 |
| 调整预算 / 日期 / 人数 | `PlanningConstraintsCard` | Agent「帮我把预算改成…」 | 仅对话、无卡片反馈 |
| 查看「现在什么情况」 | `DecisionStrip` 结论层 | — | 侧边栏长回复代替 Strip |
| 对比 2–3 个方案 | `SolutionMatrixPanel` | Plan Gate Drawer（完整对比） | 聊天列表式方案 |
| 理解为何推荐 A 而非 B | 矩阵差值高亮 + Strip 展开 | EvidenceDrawer | 无依据的精美卡片 |
| 约束冲突 / 不可解 | `RelaxationSuggestionBar` + Strip `blocked` | Agent 松弛对话 | **静默近似解** |
| 微调日程时间 / 顺序 | `ScheduleTab` | Strip CTA「微调时间」 | Agent 代替拖拽 |
| 查看 Gate / 三人格依据 | Strip 展开 + EvidenceDrawer | Plan Gate Drawer | Debug 串直出 C 端 |
| 团队偏好冲突（M3） | Strip `needs_consensus` + 热力图 | Agent 调解 | 独立协商控制台 Tab |
| 提交方案到时间轴 | Plan Gate Drawer | — | 矩阵内第二主按钮 |

---

## 4. 界面层级与注意力

```
优先级（高 → 低）
1. Decision Strip — 单结论 + 单主 CTA
2. 约束-方案区 — 矩阵默认折叠，展开后不增加主 CTA
3. Tab 主内容 — 日程 / 预算 / 行前 / 团队
4. Agent 侧边栏 — 始终可达，不抢主区首屏
```

**硬规则**

1. 全页 **仅 1 个 filled 主按钮**（Strip 主 CTA）
2. 矩阵列选中 **改变 Strip CTA 文案**，不新增按钮
3. 顶栏业务 Pipeline 与 Strip 编排七步 **不同屏强展示**（见 Decision Strip PRD §3.1）

---

## 5. 对话 vs 结构化：决策树

```
用户进入 Plan Studio
    │
    ├─ 无行程结论 / 无 guards
    │     → idle Strip + 引导打开助手（对话）
    │
    ├─ 有 compare 读模型（≥2 方案）
    │     → Strip 结论 + 折叠矩阵
    │     → 主 CTA「查看方案对比」→ 展开矩阵 或 Plan Gate Drawer
    │
    ├─ 约束待确认
    │     → PlanningConstraintsCard 主操作
    │     → 对话仅用于「说不清时问助手」
    │
    ├─ Gate BLOCK / 冲突
    │     → Strip blocked + 松弛条 + 可执行证明
    │     → 对话用于逐项协商，不替代冲突列表
    │
    └─ topology_locked
          → Strip「微调时间」→ ScheduleTab
          → 对话不直接改拓扑
```

---

## 6. 渐进揭示与透明化边界

| 层级 | 对话 | 结构化 | 受众 |
|------|------|--------|------|
| 结论 | 一句摘要可出现在 Agent | Strip 默认 | 全部 C 端 |
| 原因 | 多轮解释 | 矩阵差值、Strip 展开 | C 端 |
| 数据 | 引用 / 证据摘要 | EvidenceDrawer、Plan Gate | C 端主动展开 |
| 审计 | — | 编排七步、reason codes | 专家 / B 端 |

C 端 **不得** 默认展示 `stop=`、`rechecks=`、Sub-Agent 名（见 persona-alerts BFF 契约）。

---

## 7. 移动端差异

| 桌面 | 移动 |
|------|------|
| 约束带 + 矩阵并列 | 约束折叠；矩阵为卡片 carousel |
| Plan Gate Drawer 宽屏 | 全屏 Sheet |
| 松弛条三按钮横排 | 主建议 1 按钮 + 「在助手中讨论」 |

移动 **优先对话松弛**；矩阵超过 2 列时禁止横向滚宽表。

---

## 8. 与 Agent 的数据流

```
写入（mutation）                    读取（read model）
─────────────────                  ─────────────────
route_and_run ──→ guards store     guards store ──→ Strip
                ──→ compare store  compare store ──→ Matrix
                ──→ task store     task store ──→ Strip running
约束 API ──→ constraints summary   constraints ──→ 约束卡片
```

Strip / 矩阵 **只读** compare 与 guards；写操作经 Strip CTA → `route_and_run` 或现有 Dialog。

**2026-06-27 落地补充**

- 主区松弛条与 Agent 气泡 **互斥展示**（助手侧栏展开时隐藏主区条，防重复）
- `DecisionCockpitPanel` 与矩阵/compare 默认互斥；专家深链 `?decisionCockpit=1`
- 约束「待对齐」badge / 待办入口可滚动至 `#plan-studio-relaxation-bar`

---

## 9. 反模式速查

| 反模式 | 正确做法 |
|--------|----------|
| 在 Agent 里粘贴整张方案对比表 | 展开 SolutionMatrixPanel |
| 矩阵内「应用优化」「提交」双 CTA | 仅 Strip 主 CTA |
| 约束改了无 UI 反馈 | 快路径 skeleton / 慢路径 Strip running |
| 冲突已存在仍显示「一切正常」 | Strip `blocked` + 松弛条 |
| 恢复 workbench / what-if Tab | Plan Gate Drawer + 矩阵 + Agent |

---

## 10. 验收清单（设计 QA）

- [ ] 首屏 3s 内可见 Strip 结论（无矩阵抢屏）
- [ ] 有 ≥2 方案时，不打开侧边栏可选方案（矩阵展开后）
- [ ] 全页 filled 主按钮计数 = 1
- [ ] 约束编辑后 800ms 内有视觉反馈
- [ ] BLOCK 态零静默降级
- [ ] C 端无 debug 串（persona-alerts / Strip 抽检）

---

## 11. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-06-27 | 初版；采纳 REQ-2026-UIX-01 设计评审混合架构立场 |
| 2026-06-27 | §8 补充 M2 落地：松弛去重、Cockpit 互斥、冲突滚动至松弛条 |
