# 加载态 vs 骨架屏 - 产品经理决策方案

## 一、决策原则

| 维度 | 用 **LogoLoading** | 用 **骨架屏** |
|------|-------------------|---------------|
| **内容结构** | 不可预测、首次进入、布局未知 | 可预测、用户熟悉、布局固定 |
| **加载时长** | 通常 <1.5s、快速反馈 | 通常 >1.5s、需降低焦虑 |
| **空间** | 小区域（卡片内、抽屉 Tab） | 大区域（整页、主内容区） |
| **用户心智** | 入口页、初始化、一次性操作 | 列表/详情、可重复访问 |

**核心结论**：结构可预测 + 加载可能较长 → 骨架屏；结构未知或加载很快 → LogoLoading。

---

## 二、页面级决策表

### 2.1 规划工作台（Plan Studio）

| 页面/场景 | 当前 | 建议 | 理由 |
|-----------|------|------|------|
| **plan-studio 入口** | LogoLoading | **保持 LogoLoading** | 入口页、无内容结构、加载快 |
| **ScheduleTab 主加载** | ScheduleTabSkeleton | **保持骨架屏** ✓ | 时间轴结构固定、加载可能较慢 |
| **ScheduleTab 准备度卡片** | LogoLoading | **保持 LogoLoading** | 小区域、加载快 |
| **PlacesTab 搜索结果** | LogoLoading | **改为骨架屏** | 地点卡片列表结构固定、搜索 1–3s |
| **BudgetTab 主加载** | LogoLoading | **改为骨架屏** | 预算卡片+Tab 结构固定 |
| **BudgetTab 子 Tab** | LogoLoading | **改为骨架屏** | 费用汇总/未支付/日志结构固定 |
| **IntentTab 主加载** | LogoLoading | **改为骨架屏** | 意图表单+卡片结构固定 |
| **DecisionDraftTab** | LogoLoading | **改为骨架屏** | 决策卡片网格结构固定 |
| **PlanVariantsPage** | LogoLoading | **保持 LogoLoading** | 生成中、进度感强、结构未知 |
| **PlanningWorkbenchTab** | LogoLoading + Skeleton | **保持现状** ✓ | 有进度条+阶段+骨架预览，适合长任务 |

### 2.2 行程详情（Trip Detail）

| 页面/场景 | 当前 | 建议 | 理由 |
|-----------|------|------|------|
| **trips/[id] 首次加载** | LogoLoading | **改为骨架屏** | Tab 布局固定、加载可能较长 |
| **trips/[id] 三人格 Tab** | LogoLoading | **改为骨架屏** | Abu/DrDre/Neptune 卡片结构固定 |
| **trips/[id] 复盘 Tab** | LogoLoading | **改为骨架屏** | 复盘内容结构可预测 |
| **trips/[id] 删除中** | Spinner | **保持 Spinner** | 按钮内联、操作反馈 |

### 2.3 执行页（Execute）

| 页面/场景 | 当前 | 建议 | 理由 |
|-----------|------|------|------|
| **execute 全页加载** | LogoLoading | **保持 LogoLoading** | 入口、加载通常较快 |
| **修复方案生成** | LogoLoading | **保持 LogoLoading** | 结构未知、有文案说明 |

### 2.4 准备度（Readiness）

| 页面/场景 | 当前 | 建议 | 理由 |
|-----------|------|------|------|
| **readiness 全页加载** | LogoLoading | **改为骨架屏** | 分数+卡片+区块结构固定、加载可能较长 |
| **能力包加载** | LogoLoading | **改为骨架屏** | 能力包列表结构固定 |
| **证据列表加载** | LogoLoading | **改为骨架屏** | 证据列表结构固定 |

### 2.5 其他页面

| 页面/场景 | 当前 | 建议 | 理由 |
|-----------|------|------|------|
| **Dashboard** | LogoLoading | **保持 LogoLoading** | 入口、加载快 |
| **settings** | LogoLoading | **保持 LogoLoading** | 表单区块、加载快 |
| **trips/schedule** | LogoLoading | **改为骨架屏** | 日程结构固定 |
| **trips/budget** | LogoLoading | **改为骨架屏** | 预算结构固定 |
| **countries/templates** | LogoLoading | **改为骨架屏** | 模板卡片网格固定 |
| **EvidenceDrawer** | LogoLoading | **改为骨架屏** | 证据/风险/决策列表结构固定 |
| **EnhancedAddItineraryItemDialog 搜索** | LogoLoading | **改为骨架屏** | 地点卡片列表固定 |

---

## 三、组件级决策（抽屉/弹窗）

| 组件 | 当前 | 建议 | 理由 |
|------|------|------|------|
| **EvidenceDrawer 各 Tab** | LogoLoading | **骨架屏** | 列表结构固定 |
| **ReadinessDrawer** | LogoLoading | **骨架屏** | 准备度内容结构固定 |
| **SuggestionPreviewDialog** | LogoLoading | **骨架屏** | 建议卡片结构固定 |
| **MetricExplanationDialog** | LogoLoading | **保持 LogoLoading** | 内容结构可能多变 |

---

## 四、实施优先级

### P0（高价值、高曝光）✅ 已实施
1. **ScheduleTab** - 已用骨架屏 ✓
2. **trips/[id] 首次加载** - 已改为 TripDetailSkeleton ✓
3. **readiness 全页** - 已改为 ReadinessPageSkeleton ✓
4. **PlacesTab 搜索结果** - 已改为 PlacesSearchSkeleton ✓

### P1（中价值）✅ 已实施
5. **BudgetTab** - 已改为 BudgetTabSkeleton ✓
6. **IntentTab** - 已改为 IntentTabSkeleton ✓
7. **EvidenceDrawer** - 已改为 EvidenceDrawerSkeleton ✓
8. **trips/schedule** - 已改为 SchedulePageSkeleton ✓
9. **trips/budget** - 已改为 BudgetPageSkeleton ✓

### P2（低优先级）
10. **DecisionDraftTab** - 改为骨架屏
11. **countries/templates** - 改为骨架屏
12. **EnhancedAddItineraryItemDialog** - 改为骨架屏

---

## 五、需新增的骨架屏组件

| 骨架屏 | 对应页面 | 结构描述 |
|--------|----------|----------|
| `PlacesTabSkeleton` | PlacesTab | 地点卡片列表 x4–6 |
| `BudgetTabSkeleton` | BudgetTab | 预算概览卡 + Tab + 统计格 |
| `IntentTabSkeleton` | IntentTab | 意图表单 + 卡片区 |
| `ReadinessPageSkeleton` | readiness | 分数卡 + 区块列表 |
| `TripDetailSkeleton` | trips/[id] | Tab + 内容区占位 |
| `EvidenceDrawerSkeleton` | EvidenceDrawer | 列表项 x5 |
| `SchedulePageSkeleton` | trips/schedule | 日程时间轴 |
| `BudgetPageSkeleton` | trips/budget | 预算卡片网格 |
| `TemplatesGridSkeleton` | countries/templates | 模板卡片网格 |
| `PlaceSearchSkeleton` | EnhancedAddItineraryItemDialog | 地点卡片 x3 |

---

## 六、保持 LogoLoading 的场景（不改为骨架屏）

- 入口页：Dashboard、plan-studio index、execute
- 小区域：准备度卡片、按钮内联、Tab 内小块
- 结构未知：PlanVariantsPage 生成中、修复方案生成
- 有进度条：PlanningWorkbenchTab（LogoLoading + 进度 + 骨架预览）
