# 团队协作中心 · 交互与视觉规范

**目标受众**：产品经理、交互设计师、视觉设计师、前端开发、测试  
**关联模块**：规划工作台 `plan-studio/index.tsx`、`PlanningWorkbenchHeader`、`PlanStudioCollaborationMenu`  
**设计稿参考**：5 张 TripNARA 团队协作中心原型（成员与角色 / 协作决策 / 团队画像 / 私密想法 / 任务分工）  
**设计原则**：结论优先 | 单一入口 | 渐进披露 | 与规划工作台视觉 token 一致  
**版本**：v1.0 · 2026-06-29

---

## 一、背景与目标

### 1.1 现状问题

当前规划工作台的团队协作能力**分散在顶栏多个入口**：

| 入口 | 组件 | 问题 |
|------|------|------|
| 「决策画像」 | `DecisionProfilingHubDialog` | 与团队 Tab 职责重叠，用户不知去哪找 |
| 「结构化协商」 | `StructuredNegotiationDialog` | 独立弹窗，缺少全局待决概览 |
| 「团队投票」 | `SilentVoteHubDialog` | 同上 |
| 「私密想法」 | `PrivateWishDialog` | 同上 |
| 「协作中」 | `CollaboratorsDialog` | 多人时替换上述按钮，仅打开协作者管理 |
| 工作台 Tab「团队」 | `TeamTab` | 轻量成员列表 + 任务飞轮，非完整协作枢纽 |

用户需要在**多个 Dialog 与工作台 Tab 之间跳转**，无法一眼看到「团队共识度、待决事项、任务负载」的全貌。

### 1.2 目标

建立 **团队协作中心（Team Collaboration Center）** 作为多人行程协作的**唯一主枢纽**：

1. **主入口固定在规划工作台顶栏右上角**——紫色「协作」按钮，任何 Tab 下均可一键进入。
2. **五 Tab 仪表盘**整合成员、决策、画像、心愿、任务，与原型稿对齐。
3. **收敛现有 4 个 Dialog 触发器**，改为 Tab 内嵌或全屏层，保留深链能力。
4. **与左侧导航「团队」Tab 等价**：点击「协作」= 切到 `team` Tab 并展示协作中心视图。

### 1.3 非目标（v1 不做）

- 行程详情页 `[id].tsx` 的独立团队协作中心（v1 仅规划工作台）
- 实时多人光标 / 同步编辑
- 移动端独立底部 Tab 导航（v1 响应式折叠即可）

---

## 二、入口与导航架构

### 2.1 入口层级（硬约束）

```
规划工作台顶栏（任意子 Tab：行程 / 路线 / 预算 / 行前 / 团队）
┌─────────────────────────────────────────────────────────────────────┐
│ ← 标题 · 进度条    天气  [成员头像条]  [★ 协作]  [可执行性环]  …    │
└─────────────────────────────────────────────────────────────────────┘
                                              ↑
                                    唯一主入口（本规范核心）
```

| 层级 | 元素 | 职责 | 禁止 |
|------|------|------|------|
| **L0 主入口** | 顶栏「**协作**」按钮 | 打开团队协作中心（切 `activeTab=team`） | 不得再并列 决策画像/协商/投票/私密 四个 outline 按钮 |
| L1 辅助 | `WorkbenchCollaboratorsRow` | 成员头像条，点击打开协作者管理 | 不得承载子功能菜单 |
| L1 辅助 | `WorkbenchFeasibilityRing` | 可执行性分数 | 与协作无关 |
| L2 等价入口 | 工作台 Tab「团队」 | 与「协作」按钮同页同视图 | 不得展示不同内容 |
| L3 深链 | URL query | 直达协作中心某 Tab / 子面板 | — |

### 2.2 「协作」按钮规范

| 属性 | 规范 |
|------|------|
| 文案 | **协作**（sm 以下可仅图标 + `aria-label="打开团队协作中心"`） |
| 图标 | `Users` 或双人协作符号（Lucide） |
| 样式 | `variant="default"`（主色实心），`size="sm"`，`h-8 px-3 gap-1.5 text-xs` |
| 角标 | 有待决事项时显示数字 Badge（待决 + 进行中协商 + 未提交投票之和，上限 99+） |
| 位置 | 成员头像条右侧、可执行性环左侧 |
| 点击 | `onTabChange('team')` + 可选 `setCollabCenterOpen(true)`；滚动到页顶 |

**单人规划模式**：

- 「协作」按钮**仍可见**（不隐藏协作能力）。
- 角标仅计「我的心愿待优化」等个人向待办。
- 部分 Tab 展示引导态（见 §7.4）。

**替换关系**：

| 移除 / 收敛 | 迁入 Tab |
|-------------|----------|
| `DecisionProfilingHubDialog` 顶栏 trigger | 团队画像 |
| `StructuredNegotiationDialog` 顶栏 trigger | 协作决策 |
| `SilentVoteHubDialog` 顶栏 trigger | 协作决策（投票摘要区） |
| `PrivateWishDialog` 顶栏 trigger | 私密想法 |
| `showCollaboratingButton`「协作中」 | 合并为「协作」 |
| `PlanStudioCollaborationMenu`「更多」下拉 | 删除；能力全部在协作中心内 |

### 2.3 页面壳（Collaboration Center Shell）

协作中心在 **`activeTab === 'team'`** 时渲染，结构如下：

```
┌─ 页头区 ─────────────────────────────────────────────────────────┐
│ 团队协作中心                                    [邀请成员] [团队设置] │
│ 4 位成员 · 一起把行程定下来                      [新建协商]（主按钮） │
├─ 子 Tab 导航 ──────────────────────────────────────────────────────┤
│ 成员与角色 | 协作决策 | 团队画像 | 私密想法 | 任务分工              │
├─ 内容区（Dashboard Grid）──────────────────────────────────────────┤
│  [Widget 网格，见各 Tab 规格]                                       │
└────────────────────────────────────────────────────────────────────┘
```

| 页头元素 | 可见 Tab | 行为 |
|----------|----------|------|
| 邀请成员 | 全部 | 打开 `InviteMemberDialog` / `CollaboratorsDialog` |
| 团队设置 | 全部 | 打开 `TeamDecisionModeDialog`（决策模式/权重） |
| 新建协商 | 协作决策、成员与角色 | 打开结构化协商流程，默认 Tab 切到协作决策 |
| 新建协作 | 私密想法 | 聚焦左侧心愿录入表单（同 Tab 内 scroll） |

---

## 三、子 Tab 信息架构

### 3.1 Tab 列表

| Tab value | 文案 | 默认 | 核心问题 |
|-----------|------|------|----------|
| `members` | 成员与角色 | ✓（首次进入） | 谁在场、谁决定什么 |
| `decisions` | 协作决策 | | 还有什么没定、怎么定 |
| `persona` | 团队画像 | | 团队合拍吗、钱怎么花 |
| `wishes` | 私密想法 | | 每个人真正想要什么 |
| `tasks` | 任务分工 | | 谁去做、进展如何 |

**Tab 记忆**：session 内记住上次 Tab；深链 `?collabTab=` 优先。

### 3.2 Dashboard 栅格

- **桌面（≥1024px）**：12 列 CSS Grid，`gap-4`，卡片 `workbenchCard`。
- **平板（768–1023px）**：6 列，宽卡片 `col-span-6`，窄卡片 `col-span-3`。
- **移动（<768px）**：单列堆叠，子 Tab 可横向 scroll。

---

## 四、Tab 1 · 成员与角色

### 4.1 布局（桌面）

| 区域 | 栅格 | Widget |
|------|------|--------|
| 左上 | col-span-4 | **成员与角色表** |
| 中上 | col-span-4 | **团队共识概览**（环形图） |
| 右上 | col-span-4 | **待决事项列表** |
| 左中 | col-span-3 | **团队健康度**（4 指标卡） |
| 中中 | col-span-3 | **私密想法摘要**（匿名条目预览） |
| 中右 | col-span-3 | **团队投票摘要** |
| 右中 | col-span-3 | **结构化协商摘要** |
| 底部 | col-span-12 | **任务分工预览表**（前 5 条 +「查看全部」→ 任务 Tab） |

### 4.2 Widget 规格

#### 4.2.1 成员与角色表

| 列 | 内容 | 数据源 |
|----|------|--------|
| 成员 | Avatar + 姓名 | `useTeam` / `TeamMembersList` |
| 角色 | 体验追求者 / 平衡导向者 等 | `TeamPreferenceSummary` |
| 决策权重 | 20%–30% 进度条 | `useTeamWeights` |
| 职责标签 | Tag 列表 | 成员 metadata |

行操作：编辑（`EditMemberDialog`）、移除（二次确认）。

#### 4.2.2 团队共识概览

- 中心数字：**团队共识 72%**（环形进度）
- 五维雷达/列表：行程节奏、预算分配、核心体验、住宿标准、每日强度
- 数据源：协商结果 + 投票聚合（`useTeamNegotiation`、领域影响力 API）
- 点击某一维 → 深链到协作决策 Tab 并筛选对应该领域

#### 4.2.3 待决事项列表

| 字段 | 规范 |
|------|------|
| 标题 | 如「Day 2 基础营地选取」 |
| 优先级 | 高（红）/ 中（橙）/ 低（灰）—— 复用 `workbenchSoftPriorityClass` |
| 操作 | 「去处理」→ 协作决策 Tab + 选中该议题 |

数据源：`useDomainNegotiationTasks` + 开放投票 + 未确认协作任务。

#### 4.2.4 团队健康度

四卡横排：

| 指标 | 示例值 | 语义色 |
|------|--------|--------|
| 参与度 | 88% | gate-allow |
| 沟通活跃度 | 82% | gate-allow |
| 决策效率 | 76% | gate-confirm |
| 冲突水平 | 22% | 越低越好；>50% 用 gate-reject |

v1 可部分 mock / 自 metadata 推算；接口待定。

#### 4.2.5 底部任务预览

复用 `CollaborativeTaskFlywheelPanel` 表格样式，最多 5 行，「查看全部」切换 `collabTab=tasks`。

### 4.3 空状态

无团队时：页头下展示 `TeamTabIntro` 引导卡片 +「创建团队」主按钮，Dashboard Widget 以虚线占位 + 说明文案。

---

## 五、Tab 2 · 协作决策

### 5.1 布局

| 区域 | 栅格 | Widget |
|------|------|--------|
| 顶栏统计 | col-span-12 | **4 统计卡**：待决 6 / 协商中 2 / 投票中 1 / 已达成共识 9 |
| 左列 | col-span-4 | **决策队列表** |
| 中列 | col-span-5 | **当前协作议题**（主舞台） |
| 右列 | col-span-3 | **AI 协作建议** |
| 底左 | col-span-6 | **结构化协商摘要** |
| 底右 | col-span-6 | **团队投票摘要** |

### 5.2 决策队列

| 列 | 内容 |
|----|------|
| 议题 | 文本链，点击选中 |
| 优先级 | Badge |
| 领域 | Tag（预算 / 行程 / 体验…） |
| 状态 | 协商中 / 投票中 / 待启动 |

选中行 → 中列加载该议题详情。

### 5.3 当前协作议题（主舞台）

复用并扩展 `StructuredNegotiationPanel`：

1. **进度时间轴**（5 步）：提出议题 → 澄清观点 → 澄清追问 → 优化选项 → 形成建议  
   - 已完成：实心圆 + 连线  
   - 当前：主色高亮 + pulse  
   - 未到：灰空心  

2. **发言顺序**：成员 Avatar 横条，当前发言者外环高亮 + 姓名  

3. **选项对比表**：A / B / C 列 — 核心优势、主要顾虑、支持率进度条  

4. **底栏操作**：「发起投票」「生成妥协方案」「与 Nara 讨论」

### 5.4 AI 协作建议（右侧）

| 块 | 内容 |
|----|------|
| AI 洞察 | 1–2 句冲突摘要（如「风景体验 vs 便利性」） |
| 推荐操作 | 按钮组：开始协商 / 开始投票 / 生成妥协 / 与 Nara 讨论 |
| 下一步 | 编号清单（≤4 条） |

样式：`workbenchInsightPanel`。

### 5.5 深链

| Query | 行为 |
|-------|------|
| `?collabTab=decisions` | 打开协作决策 Tab |
| `?roundId=&roundDomain=` | 选中对应该 round 的队列行（现有逻辑保留） |
| `?voteId=` | 滚动到底部投票摘要并展开 |

---

## 六、Tab 3 · 团队画像

### 6.1 布局

| 区域 | 栅格 | Widget |
|------|------|--------|
| 左上 | col-span-4 | **团队摩擦分**（72/100 环 + 中度摩擦文案） |
| 右上 | col-span-4 | **决策风格调查**（上次完成日期 + 沿用/重测） |
| 右上辅 | col-span-4 | 占位或「下一步推荐行动」 |
| 中行 | col-span-12 | **成员画像卡 × N**（4 列 grid） |
| 左下 | col-span-4 | **Money DNA 雷达 + 成员柱状对比** |
| 中下 | col-span-4 | **团队摩擦矩阵** |
| 右下 | col-span-4 | **分摊共识机制** |
| 底 | col-span-12 | **潜在摩擦点表** + **推荐行动 checklist** |

### 6.2 组件复用

| Widget | 现有组件 |
|--------|----------|
| 摩擦分环 | `FrictionRadarPanel` / 新建 `TeamFrictionScoreRing` |
| 成员画像卡 | `TravelStyleCardView` × 成员 |
| Money DNA | `MoneyDnaRadar` + `MoneyDnaCardView` |
| 摩擦矩阵 | `FrictionRadarPanel` 垂直列表变体 |
| 分摊共识 | `SplitConsensusPanel` |
| 决策风格 | `DecisionProfilingPanel`（去 Dialog 壳） |
| Quiz 入口 | `DecisionProfilingQuizDialog`（内嵌触发） |

### 6.3 交互

- 「重新测评」→ 打开 `DecisionProfilingQuizDialog`
- 「沿用上次结果」→ 见 `docs/prd/decision-profiling-profile-reuse-prd.md`
- 摩擦点表行点击 → 深链协作决策 Tab 预填议题

---

## 七、Tab 4 · 私密想法

### 7.1 布局（三列）

| 列 | 栅格 | 内容 |
|----|------|------|
| 左 | col-span-4 | **记录心愿表单** |
| 中 | col-span-5 | **我的心愿 / 团队心愿** 子 Tab + 卡片列表 |
| 右 | col-span-3 | **心愿概览统计 + 隐私说明 + 影响分布环图** |
| 底 | col-span-12 | **AI 洞察三连卡** + 「让 AI 更懂你」CTA |

### 7.2 表单字段

复用 `PrivateWishDialog` / `PrivateWishlistPanel` 字段：

| 字段 | 控件 |
|------|------|
| 心愿领域 | `WishCategorySelect` |
| 描述 | Textarea，300 字上限 |
| 重要程度 | 1–5 滑块 |
| AI 优化建议 | Switch |
| 可见性 | `WishVisibilityToggle`：私密 / 匿名 / 公开 |

主按钮：「提交心愿」— `workbenchPrimaryAction` 全宽。

### 7.3 列表与统计

- **我的心愿**：`WishItemCard` 列表，状态 Planned / 待优化  
- **团队心愿**：显示 Anonymous / Public / AI 已纳入 标签  
- **影响分布**：按领域 donut chart（活动体验 29%、自然风景 29%…）  
- **AI 洞察**：相似心愿聚类、冲突检测、对行程影响（预算 +¥、时间 +0.5 天）

### 7.4 单人模式

- 「团队心愿」区展示空状态：「邀请成员后可见团队心愿」  
- 表单与「我的心愿」正常可用  

---

## 八、Tab 5 · 任务分工

### 8.1 布局

| 区域 | 栅格 | Widget |
|------|------|--------|
| 顶栏 | col-span-12 | **5 统计卡**：全部 18 / 进行中 7 / 待处理 5 / 已完成 6 / 完成率 64% |
| 主区 | col-span-8 | **任务看板表** |
| 右栏 | col-span-4 | **任务洞察 + 负载平衡 + AI 分配建议 + 快捷操作 + 成员负载** |

### 8.2 任务看板表

| 列 | 内容 |
|----|------|
| 任务名 | 文本 |
| 描述 | 次要文字，可截断 |
| 关联领域 | Tag |
| 负责人 | Avatar + 姓名 |
| 截止日期 | 相对时间；逾期标红 |
| 优先级 | Badge |
| 进度 | 进度条 |

**筛选 Chips**：全部 / 决策生成 / 行前准备 / 预算相关 / 协作事项

数据源：`useCollaborativeTasks`、`CollaborativeTaskFlywheelPanel`、行前任务 API。

### 8.3 右侧洞察

| Widget | 内容 |
|--------|------|
| 任务洞察 | 逾期任务警告（红色 icon + 「今日截止」） |
| 负载平衡 | 高负载 / 均衡 / 可承接 成员分组 |
| AI 分配建议 | 1 条可应用建议 +「应用建议」 |
| 快捷操作 | 重新分配 / 拆分任务 / 转为提醒 |
| 成员负载 | 成员列表 + 水平负载条（如 Claire 83%） |

### 8.4 来源与联动（底栏）

展示任务来源：决策队列、私密想法、行前准备… +「查看执行进度」链到行前 Tab。

---

## 九、视觉规范

### 9.1 与规划工作台对齐

协作中心**必须**复用 `src/components/plan-studio/workbench/workbench-ui.ts` token，**禁止**原型稿中的大面积 violet 装饰堆叠（仅主入口「协作」按钮与页头「新建协商」可用 `primary`）。

| Token | 用途 |
|-------|------|
| `workbenchCard` | 所有 Dashboard 卡片 |
| `workbenchPanelTitle` | Widget 标题 |
| `workbenchHeaderShell` | 不重复渲染；沿用外层 `PlanningWorkbenchHeader` |
| `workbenchInsightPanel` | AI 建议、洞察卡 |
| `workbenchSoftPriorityClass` | 优先级 Badge |
| `workbenchEmptySurface` | 空状态 |
| `gate-*` 语义色 | 冲突、通过、待确认状态 |

### 9.2 协作中心页头

```css
/* 语义约定 — 实现时用 Tailwind 等价类 */
.collab-center-title: text-xl font-semibold tracking-tight
.collab-center-subtitle: text-sm text-muted-foreground
.collab-sub-tab-list: h-9 border-b border-border/60
.collab-sub-tab-trigger: text-sm; active: border-b-2 border-primary font-medium
```

### 9.3 数据可视化

| 图表 | 规范 |
|------|------|
| 环形共识/摩擦分 | 直径 120–160px，中心数字 `text-2xl font-semibold tabular-nums` |
| 支持率条 | 高度 6px，`rounded-full`，主色填充 |
| 负载条 | 高度 8px；≥80% gate-confirm；≥90% gate-reject |
| Donut 分布 | 最多 6 扇区，legend 右侧或底部 |

### 9.4 触控与无障碍

- 所有可点击行/卡：最小高度 **44px**（Fitts's Law）
- Tab 导航：键盘 ←/→ 切换，Enter 选中
- 图表：提供 `aria-label` 文本摘要（如「团队共识 72%」）
- 角标：屏幕阅读器读「协作，3 项待处理」

### 9.5 暗色模式

- 卡片保持 `bg-card` + `border-border/70`
- 优先级色使用 gate token，不用纯 `#ff0000`
- 图表扇区使用 CSS 变量，确保对比度 WCAG AA

---

## 十、组件复用与新建映射

### 10.1 复用（薄包装迁入 Tab）

| 现有组件 | 迁入 Tab | 改造 |
|----------|----------|------|
| `TeamTabContent` | 成员与角色 | 拆出成员表、共识区 |
| `StructuredNegotiationPanel` | 协作决策 | 去 Dialog，保留 Panel |
| `DecisionProfilingPanel` | 团队画像 | 去 Dialog |
| `PrivateWishlistPanel` + 表单 | 私密想法 | 去 Dialog |
| `CollaborativeTaskFlywheelPanel` | 任务分工 | 扩展为完整看板 |
| `SilentVoteListPanel` | 协作决策（摘要） | 嵌入底栏 |
| `TeamTabIntro` | 成员与角色（空状态） | 不变 |

### 10.2 新建

| 组件 | 职责 |
|------|------|
| `TeamCollaborationCenter.tsx` | Shell：页头 + 子 Tab + 路由 query 同步 |
| `CollabCenterMembersTab.tsx` | Tab1 Dashboard |
| `CollabCenterDecisionsTab.tsx` | Tab2 Dashboard |
| `CollabCenterPersonaTab.tsx` | Tab3 Dashboard |
| `CollabCenterWishesTab.tsx` | Tab4 Dashboard |
| `CollabCenterTasksTab.tsx` | Tab5 Dashboard |
| `CollabPendingBadge.tsx` | 汇总待决数，供顶栏「协作」角标 |
| `CollabConsensusRing.tsx` | 通用环形指标 |

### 10.3 收敛

| 文件 | 变更 |
|------|------|
| `PlanStudioCollaborationMenu.tsx` | 移除 outline triggers；保留 Dialog 逻辑供深链 / 内嵌调用 |
| `PlanningWorkbenchHeader.tsx` | `collaborationMenu` → 单一「协作」按钮 + `CollabPendingBadge` |
| `TeamTab.tsx` | 渲染 `TeamCollaborationCenter` 替代当前简单组合 |

---

## 十一、路由与状态

### 11.1 URL Query

| 参数 | 类型 | 说明 |
|------|------|------|
| `tab` | `team` | 工作台 Tab（已有） |
| `collabTab` | `members\|decisions\|persona\|wishes\|tasks` | 协作中心子 Tab |
| `roundId` | string | 协商 round（已有） |
| `roundDomain` | string | 协商领域（已有） |
| `voteId` | string | 投票 ID |
| `wishId` | string | 高亮某条心愿 |

示例：`/plan-studio/:tripId?tab=team&collabTab=decisions&roundId=abc`

### 11.2 顶栏「协作」点击时序

```
1. if activeTab !== 'team' → onTabChange('team')
2. if URL 无 collabTab → 默认 collabTab=members
3. scrollTo(0, 0)
4. 可选：emit analytics collab_center_open
```

### 11.3 从其他模块跳入

| 来源 | 行为 |
|------|------|
| Agent 建议「发起协商」 | `tab=team&collabTab=decisions` + 打开新建协商 |
| 决策画像 Banner | `tab=team&collabTab=persona` |
| 私密想法 NL 意图 | `tab=team&collabTab=wishes` |
| 任务逾期通知 | `tab=team&collabTab=tasks` |

---

## 十二、边界与降级

| 场景 | 处理 |
|------|------|
| 无 tripId | 不渲染协作按钮 |
| 团队加载失败 | 页头下 Error Banner + 重试 |
| 单人无团队 | 协作中心可进；成员 Tab 引导创建；决策/投票 Widget 空状态 |
| 某 Widget API 失败 | 单卡 Error，不阻塞整页 |
| 协商/投票进行中刷新 | 恢复选中议题（roundId / voteId query） |
| 移动端 | 子 Tab 横滑；三列布局变单列；表格横向 scroll |

---

## 十三、埋点（Analytics）

| 事件名 | 触发 | 属性 |
|--------|------|------|
| `collab_center_open` | 点击顶栏「协作」 | `trip_id`, `from_tab`, `member_count` |
| `collab_tab_switch` | 切换子 Tab | `trip_id`, `collab_tab` |
| `collab_pending_click` | 点击待决「去处理」 | `trip_id`, `item_id`, `item_type` |
| `collab_negotiation_start` | 新建协商 | `trip_id`, `domain` |
| `collab_vote_start` | 从议题发起投票 | `trip_id`, `vote_id` |
| `collab_wish_submit` | 提交心愿 | `trip_id`, `visibility`, `category` |
| `collab_task_apply_ai` | 应用 AI 分配建议 | `trip_id`, `task_id` |

---

## 十四、分阶段实施

### Phase 1 · 入口与壳（P0，≈3d）

- [ ] 顶栏「协作」按钮替换现有分散入口
- [ ] `TeamCollaborationCenter` Shell + 5 Tab 导航
- [ ] `TeamTab` 接入 Shell；URL `collabTab` 同步
- [ ] `CollabPendingBadge` 聚合角标

### Phase 2 · 核心 Tab（P0，≈5d）

- [ ] **成员与角色**：成员表 + 待决列表 + 共识环（可部分 mock）
- [ ] **协作决策**：决策队列 + 嵌入 `StructuredNegotiationPanel`
- [ ] **私密想法**：迁入 `PrivateWishlistPanel` 表单与列表

### Phase 3 · 画像与任务（P1，≈4d）

- [ ] **团队画像**：嵌入 `DecisionProfilingPanel` + Money DNA + 摩擦矩阵
- [ ] **任务分工**：扩展 `CollaborativeTaskFlywheelPanel` + 负载洞察

### Phase 4 · 摘要联动（P1，≈2d）

- [ ] Tab1 底部摘要 Widget 与 Tab2/4/5 联动
- [ ] 深链 `voteId` / `wishId` 完整支持
- [ ] 埋点接入

### Phase 5 ·  polish（P2）

- [ ] 团队健康度 API 对接
- [ ] 响应式细节与暗色模式验收
- [ ] 无障碍审计

---

## 十五、验收 Checklist

### 入口

- [ ] 任意工作台 Tab 下，顶栏可见「协作」主按钮（实心 primary）
- [ ] 不再并列显示 决策画像 / 结构化协商 / 团队投票 / 私密想法 四个 outline 按钮
- [ ] 点击「协作」进入团队协作中心，且工作台 Tab 切到「团队」
- [ ] 有待决事项时角标数字正确

### 协作中心

- [ ] 五 Tab 可切换，URL `collabTab` 可分享深链
- [ ] 页头「邀请成员」「团队设置」「新建协商」行为正确
- [ ] 各 Tab 布局与本文 §4–§8 一致（允许 v1 部分 Widget 占位/mock）

### 功能闭环

- [ ] 协作决策：可选议题、可查看协商进度、可发起投票
- [ ] 团队画像：可完成/沿用决策风格测评，可见摩擦矩阵
- [ ] 私密想法：可提交心愿，可见我的/团队列表
- [ ] 任务分工：可看板筛选、可见负载与逾期提示

### 视觉

- [ ] 使用 `workbenchCard` 等 token，无违规 violet 大色块
- [ ] 触控目标 ≥44px；暗色模式对比度合格

### 回归

- [ ] 现有 `?roundId=` 深链仍可达协商
- [ ] `CollaboratorsDialog` 从头像条可打开
- [ ] 单人规划模式协作中心可进入且不报错

---

## 十六、相关文档

| 文档 | 关系 |
|------|------|
| `docs/team-tab-product-interaction-design.md` | 行程详情团队 Tab（职责分离） |
| `docs/prd/decision-profiling-profile-reuse-prd.md` | 团队画像 Tab 测评沿用 |
| `docs/api/context-api.md` | 协作记忆 / 私密愿望 API |
| `docs/api/team-tab-backend-requirements.md` | 邀请等后端需求 |
| `.claude/agents/协商结果-视觉方案.md` | 协商结果卡片风格 |
| `src/components/plan-studio/workbench/workbench-ui.ts` | 视觉 token 源 |

---

*文档版本：v1.0 | 2026-06-29 | 依据 5 张团队协作中心原型定稿*
