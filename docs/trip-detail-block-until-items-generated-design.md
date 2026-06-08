# 行程项未生成时禁止进入详情页 - 交互与视觉设计方案

**目标受众**：产品经理、交互设计师、视觉设计师、前端开发  
**关联模块**：行程列表、侧边栏、行程详情页 `[id].tsx`、规划工作台 `plan-studio`  
**设计原则**：避免空状态困惑 | 明确等待预期 | 降低挫败感 | 与现有 TripPlanningWaitDialog 风格一致

---

## 一、现状与问题

### 1.1 当前行为

| 场景 | 当前行为 | 问题 |
|------|----------|------|
| 自然语言创建行程 | 创建成功后跳转 plan-studio，后台生成行程项（2–5 分钟） | 用户立即看到空日程，不知道是在加载还是本就为空 |
| 表单创建行程 | 创建成功后跳转 trips/[id] | 同上，详情页无行程项时显得「空荡荡」 |
| 侧边栏点击规划中行程 | 直接进入 plan-studio | 可能无日程数据 |
| 行程列表点击行程卡 | 直接进入 trips/[id] | 同上 |
| 直接访问 /trips/xxx URL | 进入详情页 | 无拦截，展示空内容 |

### 1.2 设计目标

- **未生成行程项时**：不允许进入行程详情页 / 规划工作台（或进入后只展示「生成中」占位）
- **生成完成后**：正常进入详情页
- **视觉**：在列表、侧边栏明确区分「已就绪」与「生成中」状态

---

## 二、判断「行程项是否已生成」的规则

建议统一使用以下逻辑（与 `TripPlanningWaitDialog.isTripPlanningComplete` 一致）：

| 优先级 | 判断依据 | 说明 |
|--------|----------|------|
| 1 | `metadata.generationProgress.status === 'completed'` | API 返回的生成进度 |
| 2 | `TripDay` 存在且至少有一天有 `ItineraryItem.length > 0` | 有实际行程项 |
| 3 | `statistics.totalItems > 0` | 统计信息有行程项 |
| 4 | `metadata.generationProgress.status === 'failed'` | 生成失败，允许进入（显示空状态 + 重试） |

**列表侧判断**：若 API 不返回完整 TripDetail，需在 `GET /trips` 列表接口中增加：

- `hasItineraryItems: boolean`，或  
- `itemsCount: number`（> 0 视为已生成）

若短期内无法改 API，可：点击时先 `GET /trips/:id` 拉详情，再根据上述规则决定是否放行。

---

## 三、交互设计方案

### 3.1 入口与拦截点

| 入口 | 行为 | 未就绪时的交互 |
|------|------|----------------|
| **侧边栏 - 规划中行程** | 点击 → plan-studio | 拦截：在列表项上显示「生成中」，点击不跳转，或弹出轻提示 |
| **侧边栏 - 进行中/已完成行程** | 点击 → trips/[id] | 拦截：同上 |
| **行程列表页 - 行程卡片** | 点击 → trips/[id] | 拦截：卡片显示「生成中」态，点击弹出「等待生成」轻提示或弹窗 |
| **直接访问 /trips/:id** | 进入详情页 | 拦截：详情页加载后检测，未就绪则展示「生成中占位页」替代正常内容 |
| **直接访问 plan-studio?tripId=xxx** | 进入规划工作台 | 同上，展示占位 |
| **创建成功后的跳转** | 跳转 plan-studio 或 trips/[id] | 若 `generatingItems=true`：跳转到「生成中占位页」而非空内容 |

### 3.2 推荐交互流程（结论优先）

```
用户点击行程
    ↓
是否有 items？ ─── 是 ──→ 正常进入详情 / plan-studio
    ↓ 否
显示「生成中」状态
    ├─ 列表/侧边栏：卡片带「生成中」标签，点击 → Toast「行程项生成中，请稍候」+ 可选「查看进度」
    └─ 已进入详情 / plan-studio：展示「生成中占位页」（可轮询，完成后自动刷新）
```

### 3.3 具体交互规范

| 场景 | 用户操作 | 系统反馈 |
|------|----------|----------|
| 点击未就绪的侧边栏行程 | 点击 | Toast「行程项生成中，预计 2–5 分钟，请稍后刷新」；不跳转 |
| 点击未就绪的行程卡片 | 点击 | 同上；或弹出轻量 Dialog「行程项生成中」+ 主按钮「稍后查看」关闭 |
| 已进入详情页但检测到未就绪 | 页面加载 | 展示「生成中占位页」全屏占位，带进度条 + 文案；轮询完成后自动刷新 |
| 生成失败 | 占位页展示 | 显示「生成失败」+ 原因 + 「重试」按钮 |
| 创建成功且 generatingItems=true | 跳转 | 跳转到「生成中占位页」URL（如 `/trips/:id?generating=1`），而非直接展示空日程 |

---

## 四、视觉设计方案

### 4.1 列表 / 侧边栏 - 「生成中」状态

| 元素 | 规范 | 说明 |
|------|------|------|
| **主标签** | Badge：`生成中`，背景 `bg-amber-50`，文字 `text-amber-700`，边框 `border-amber-200` | 与「规划中」区分，amber 表示进行中 |
| **图标** | `Loader2` 小尺寸旋转动画，或 `Clock` | 传达「等待」 |
| **点击态** | `cursor-not-allowed` 或 `cursor-default`，hover 时 Tooltip：「行程项生成中，请稍候」 | 降低误点期待 |
| **可选** | 卡片/列表项整体 `opacity-90`，或底部细线 `border-amber-200` | 弱化视觉权重 |

**侧边栏行程项示例**：
```
[地图图标] 冰岛 2026-02-22  [生成中]  [⋮]
```
- 「生成中」Badge 在行程名称右侧
- 点击整行：不跳转，Toast 提示

**行程卡片示例**：
- 在现有 Badge 旁增加「生成中」或替换为「生成中」
- 卡片点击：拦截 + Toast

### 4.2 详情页 / 规划工作台 - 「生成中占位页」

复用并扩展 `TripPlanningWaitDialog` 的视觉体系，作为全屏占位：

| 区块 | 内容 | 规范 |
|------|------|------|
| **插画区** | 地图 + 路线 + 指南针（与 TripPlanningWaitDialog 一致） | 256×256，线条 stroke #1F2937，节点 #DC2626 |
| **标题** | 「行程项生成中」 | 18px，font-semibold |
| **描述** | 「系统正在为您生成详细行程安排，预计需要 2–5 分钟」 | 14px，text-muted-foreground |
| **进度条** | 根据 `generationProgress.stage` 映射百分比 | 同 TripPlanningWaitDialog |
| **阶段文案** | 如「正在检索候选地点…」「LLM 编排完成，正在保存…」 | 12px，居中 |
| **失败态** | 红色 Alert + 失败原因 + 「重试」按钮 | 与现有 Error 风格一致 |
| **底部** | 可选「返回行程列表」链接 | 不强引导，留出口 |

### 4.3 占位页布局示意

```
┌─────────────────────────────────────────────────┐
│                                                   │
│              [地图 + 路线插画 256×256]             │
│                                                   │
│              行程项生成中                          │
│    系统正在为您生成详细行程安排，预计需要 2–5 分钟    │
│                                                   │
│    ████████████░░░░░░░░░░░░░░░░░░  70%             │
│                                                   │
│        ✅ LLM 编排完成，正在保存行程项...           │
│                                                   │
│              [ 返回行程列表 ]                      │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 4.4 文案规范

| 场景 | 中文 | 英文（如需） |
|------|------|-------------|
| 列表 Badge | 生成中 | Generating |
| Toast | 行程项生成中，预计 2–5 分钟，请稍后刷新 | Generating itinerary items. Please refresh in 2–5 minutes |
| 占位页标题 | 行程项生成中 | Generating itinerary |
| 占位页描述 | 系统正在为您生成详细行程安排，预计需要 2–5 分钟 | We're generating your detailed itinerary. This usually takes 2–5 minutes |
| 失败标题 | 生成失败 | Generation failed |
| 失败操作 | 重试 | Retry |

---

## 五、技术实现要点

### 5.1 数据结构扩展

- **TripListItem**（若列表 API 支持）：增加 `hasItineraryItems?: boolean` 或 `itemsCount?: number`
- **TripDetail**：已有 `metadata.generationProgress`、`TripDay`、`statistics`，无需新增

### 5.2 拦截实现建议

| 位置 | 实现方式 |
|------|----------|
| 侧边栏 `handleTripClick` | 若 `!hasItineraryItems`：`toast.info(...)`，`return`，不 `navigate` |
| 行程列表 `handleTripClick` | 同上，点击时若列表有 `hasItineraryItems` 则校验；否则先 `GET /trips/:id` 再决定 |
| 详情页 `[id].tsx` | 加载 trip 后 `if (!isTripPlanningComplete(trip))`：渲染 `TripGeneratingPlaceholder` 全屏占位，内部轮询 |
| plan-studio | 同上，有 tripId 时拉 trip，未就绪则渲染占位 |
| 创建成功跳转 | 若 `generatingItems`：`navigate` 到带 `?generating=1` 的 URL，目标页检测后展示占位 |

### 5.3 复用组件

- `TripPlanningWaitDialog` 的逻辑（`isTripPlanningComplete`、轮询、进度展示）可抽离为 `useTripGeneratingCheck` hook
- 占位页可复用 Dialog 内的插画与进度 UI，封装为 `TripGeneratingPlaceholder` 全屏组件

---

## 六、验收标准

| 项目 | 标准 |
|------|------|
| 列表/侧边栏 | 未就绪行程有「生成中」Badge，点击不跳转，有 Toast |
| 详情页 | 未就绪时展示占位页，轮询完成后自动刷新 |
| 创建后跳转 | generatingItems 时进入占位页而非空日程 |
| 失败态 | 占位页展示失败原因和重试入口 |
| 视觉 | 与 TripPlanningWaitDialog 风格一致，文案清晰 |

---

## 七、后续可选优化

1. **推送/WebSocket**：生成完成后服务端推送，减少轮询
2. **预估时间**：根据历史数据展示「预计还需 X 分钟」
3. **后台提示**：生成完成后 Toast「行程项已生成，点击查看」+ 可点跳转
