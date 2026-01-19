# 规划工作台右侧助手对话框 - 交互逻辑梳理

> 更新日期：2026-01-17  
> 版本：v1.0.0

---

## 📋 目录

1. [概述](#概述)
2. [核心组件架构](#核心组件架构)
3. [会话生命周期](#会话生命周期)
4. [消息交互流程](#消息交互流程)
5. [上下文传递机制](#上下文传递机制)
6. [快捷操作处理](#快捷操作处理)
7. [修改确认流程](#修改确认流程)
8. [意图消歧系统](#意图消歧系统)
9. [三人格守护者系统](#三人格守护者系统)
10. [富内容展示](#富内容展示)
11. [错误处理与恢复](#错误处理与恢复)
12. [状态同步机制](#状态同步机制)

---

## 概述

规划工作台右侧助手对话框（NARA 助手）是一个智能对话界面，支持：
- ✅ 自然语言对话
- ✅ 上下文感知（知道用户当前查看的天数、选中的行程项）
- ✅ 快捷操作按钮
- ✅ 修改确认/拒绝
- ✅ 富文本内容展示（时间线、对比表、清单、POI推荐）
- ✅ 意图消歧（当用户意图不明确时）
- ✅ 三人格守护者系统（安全、节奏、体验评估）
- ✅ 撤销操作

---

## 核心组件架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentChatSidebar                          │
│  (侧边栏容器，控制展开/收起状态)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              TripPlannerAssistant                            │
│  (主组件，管理消息列表、输入、快捷操作)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ useTrip      │  │ PlanStudio   │  │ Formatted    │
│ Planner      │  │ Context      │  │ Message      │
│ Assistant    │  │              │  │              │
│ (Hook)       │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ tripPlanner  │  │ selected     │  │ 消息解析与    │
│ Api          │  │ Context      │  │ 渲染组件      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 关键组件说明

1. **AgentChatSidebar** (`src/components/agent/AgentChatSidebar.tsx`)
   - 侧边栏容器组件
   - 管理展开/收起状态（localStorage 持久化）
   - 根据 `entryPoint` 渲染不同的助手组件
   - 注册 `onOpenAssistant` 回调，允许其他组件打开侧边栏

2. **TripPlannerAssistant** (`src/components/trip-planner/TripPlannerAssistant.tsx`)
   - 主对话界面组件
   - 管理消息列表、输入框、快捷操作
   - 集成多个子组件（GuardianPanel、DetectedGapsPanel、PendingChangesPanel 等）

3. **useTripPlannerAssistant** (`src/hooks/useTripPlannerAssistant.ts`)
   - 核心业务逻辑 Hook
   - 管理会话状态、消息列表、待确认修改
   - 封装 API 调用（start、chat、applySuggestion、undo）

4. **PlanStudioContext** (`src/contexts/PlanStudioContext.tsx`)
   - 全局上下文，连接左侧行程视图和右侧助手
   - 管理选中上下文（天数、行程项）
   - 提供 `askAssistantAbout` 方法，允许左侧组件向助手提问

---

## 会话生命周期

### 1. 会话启动

**触发时机：**
- 组件挂载时（`autoStart=true`）
- `tripId` 变化时（自动重置并重新启动）

**流程：**

```
用户进入规划工作台
    │
    ▼
AgentChatSidebar 渲染
    │
    ▼
TripPlannerAssistant 挂载
    │
    ▼
useTripPlannerAssistant Hook 初始化
    │
    ▼
useEffect 检测到 autoStart=true && tripId 存在
    │
    ▼
调用 startSession()
    │
    ▼
POST /trip-planner/start
    │
    ▼
后端返回：
  - sessionId
  - phase (OVERVIEW | PLANNING | REFINING)
  - message (欢迎消息)
  - richContent (可选)
  - quickActions (可选)
    │
    ▼
addAssistantMessage() 添加欢迎消息
    │
    ▼
更新状态：
  - sessionId
  - currentPhase
  - messages
  - isInitialized = true
    │
    ▼
显示欢迎消息和快捷操作
```

**关键代码：**

```typescript
// useTripPlannerAssistant.ts
const startSession = useCallback(async () => {
  if (!tripId || loading || initializingRef.current) return;
  
  initializingRef.current = true;
  setLoading(true);
  
  const response = await tripPlannerApi.start({ tripId });
  
  setSessionId(response.sessionId);
  setCurrentPhase(response.phase);
  
  const welcomeMessage: PlannerMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: response.message,
    // ...
  };
  setMessages([welcomeMessage]);
  setIsInitialized(true);
  
  initializingRef.current = false;
  setLoading(false);
}, [tripId, loading]);
```

**防重复启动机制：**
- 使用 `initializingRef` 防止并发启动
- 使用 `lastTripIdRef` 跟踪 `tripId` 变化，避免 React Strict Mode 重复调用
- `hasStartedRef` 防止重复启动（已废弃，改用 `initializingRef`）

### 2. 会话重置

**触发时机：**
- `tripId` 变化时

**流程：**

```
tripId 变化
    │
    ▼
useEffect 检测到 tripId !== lastTripIdRef.current
    │
    ▼
重置状态：
  - initializingRef.current = false
  - hasStartedRef.current = false
  - lastTripIdRef.current = tripId
    │
    ▼
如果 autoStart=true，自动调用 startSession()
```

---

## 消息交互流程

### 1. 用户发送消息

**触发方式：**
1. 用户在输入框输入并点击发送
2. 点击快捷操作按钮
3. 左侧行程项点击"问NARA"按钮
4. 点击澄清选项

**流程：**

```
用户输入消息 / 点击快捷操作
    │
    ▼
handleSendMessage() / handleSendCommand()
    │
    ▼
获取当前上下文（selectedContext）
    │
    ▼
addUserMessage() 添加用户消息到列表
    │
    ▼
调用 sendMessage()
    │
    ▼
POST /trip-planner/chat
  Body: {
    tripId,
    message,
    sessionId,
    context: {
      selectedContext: {
        dayIndex, date, itemId, placeName, itemType,
        itemTime, prevItem, nextItem, dayStats
      }
    },
    clarificationData: { ... } // 如果是澄清选择
  }
    │
    ▼
后端处理并返回：
  - message (助手回复)
  - phase
  - intent
  - richContent (可选)
  - quickActions (可选)
  - pendingChanges (可选)
  - personaInsights (可选)
  - meta (可选)
    │
    ▼
addAssistantMessage() 添加助手消息
    │
    ▼
更新状态：
  - messages
  - currentPhase
  - pendingChanges
    │
    ▼
如果包含 tripUpdate，调用 onTripUpdate() 通知父组件
    │
    ▼
滚动到底部，显示新消息
```

**关键代码：**

```typescript
// TripPlannerAssistant.tsx
const handleSendMessage = useCallback(async (message: string) => {
  if (!message.trim() || loading || !isInitialized) return;
  
  // 获取当前上下文
  const context = {
    selectedContext: {
      dayIndex: selectedContext.dayIndex,
      date: selectedContext.date,
      itemId: selectedContext.itemId,
      placeName: selectedContext.placeName,
      itemType: selectedContext.itemType,
      itemTime: selectedContext.itemTime,
      prevItem: selectedContext.prevItem,
      nextItem: selectedContext.nextItem,
      dayStats: selectedContext.dayStats,
    },
  };
  
  // 发送消息
  await sendMessage(message, { context });
  
  // 清空输入框
  setInputValue('');
}, [sendMessage, selectedContext, loading, isInitialized]);
```

### 2. 消息解析与渲染

**FormattedMessage 组件负责：**
- 过滤冗余内容（引导语、功能介绍）
- 解析问题列表（"待处理"部分）
- 解析新功能信息块（夜间段、无救援段、候选路线）
- 替换 itemId 为中文名称
- 显示解决方案建议

**解析流程：**

```
原始消息文本
    │
    ▼
parseContent() 解析
    │
    ├─→ 检测问题标题（"发现...问题"）
    │   └─→ 提取问题列表
    │
    ├─→ 检测夜间段（"🌙 夜间活动提醒"）
    │   └─→ 提取夜间段信息
    │
    ├─→ 检测无救援段（"⚠️ 偏远区域提醒"）
    │   └─→ 提取无救援段信息
    │
    ├─→ 检测候选路线（"🔄 候选路线方案"）
    │   └─→ 提取候选路线信息
    │
    └─→ 普通文本段
    │
    ▼
合并并去重问题列表
    │
    ▼
渲染 segments：
  - text: 普通文本
  - problem-list: 问题列表（带编号和解决方案）
  - night-segments: 夜间段列表
  - no-rescue-segments: 无救援段列表
  - candidate-routes: 候选路线卡片
```

---

## 上下文传递机制

### 1. 上下文数据结构

```typescript
interface SelectedContext {
  // 基础上下文
  dayIndex: number | null;        // 当前选中的天数 (1-based)
  date: string | null;            // 当前选中的日期
  itemId: string | null;          // 当前选中的行程项 ID
  placeName: string | null;        // 当前选中的地点名称
  itemType: string | null;         // 当前选中的行程项类型
  
  // 扩展上下文（P1）
  itemTime?: {                    // 当前行程项的时间
    start: string;
    end: string;
  };
  prevItem?: {                     // 前一个行程项
    name: string;
    endTime: string;
    type?: string;
  };
  nextItem?: {                     // 后一个行程项
    name: string;
    startTime: string;
    type?: string;
  };
  dayStats?: {                     // 当天统计
    totalItems: number;
    hasMeal: boolean;
    hasTransit: boolean;
  };
}
```

### 2. 上下文更新流程

**左侧操作 → 更新上下文：**

```
用户在左侧操作
    │
    ├─→ 选择天数
    │   └─→ ScheduleTab.selectDay()
    │       └─→ planStudioActions.selectDay()
    │           └─→ PlanStudioContext.selectDay()
    │               └─→ setSelectedContext({ dayIndex, date, dayStats })
    │
    ├─→ 选择行程项
    │   └─→ ItineraryItemRow 点击
    │       └─→ ScheduleTab.selectItem()
    │           └─→ planStudioActions.selectItem()
    │               └─→ PlanStudioContext.selectItem()
    │                   └─→ setSelectedContext({ itemId, placeName, itemType, ... })
    │
    └─→ 点击"问NARA"按钮
        └─→ ItineraryItemRow.onAskNara()
            └─→ ScheduleTab.onAskNara()
                └─→ planStudioActions.askAssistantAbout(question, context)
                    └─→ PlanStudioContext.askAssistantAbout()
                        ├─→ onOpenAssistant() // 打开侧边栏
                        └─→ onAskAssistant(question, context) // 发送消息
```

**关键代码：**

```typescript
// ScheduleTab.tsx
onAskNara={planStudioActions ? (item, question) => {
  // 计算扩展上下文
  const dayStats = { /* ... */ };
  const prevItem = { /* ... */ };
  const nextItem = { /* ... */ };
  
  const context = {
    dayIndex: idx + 1,
    date: day.date,
    itemId: item.id,
    placeName: item.Place?.nameCN || item.Place?.nameEN || '',
    itemType: item.type,
    itemTime: { start: item.startTime, end: item.endTime },
    prevItem,
    nextItem,
    dayStats,
  };
  
  // 选中当天和行程项（同步 UI 状态）
  planStudioActions.selectDay(idx + 1, day.date, dayStats);
  planStudioActions.selectItem(item.id, context.placeName, item.type, {
    itemTime: context.itemTime,
    prevItem: context.prevItem,
    nextItem: context.nextItem,
    dayStats,
  });
  
  // 触发助手提问（直接传递 context，避免异步状态问题）
  planStudioActions.askAssistantAbout(question, context);
} : undefined}
```

### 3. 上下文显示

**ContextStatusBar 组件：**
- 显示当前选中的天数/行程项
- 提供快速提问按钮（"附近餐厅"、"停留时间"、"注意事项"）

**SelectedItemCard 组件：**
- 在消息列表中显示选中行程项的卡片
- 显示地点名称、时间、类型、天数

---

## 快捷操作处理

### 1. 快捷操作类型

```typescript
interface QuickAction {
  id: string;
  label: string;
  action: QuickActionType;
  data?: any;
  style?: 'primary' | 'secondary';
}

type QuickActionType =
  | 'CLARIFY_INTENT'      // 澄清意图
  | 'APPLY_SUGGESTION'    // 应用建议
  | 'QUERY_MORE'          // 查询更多
  | 'OPTIMIZE_ROUTE'      // 优化路线
  | 'ADD_PLACE'           // 添加地点
  | 'MODIFY_TIME'          // 修改时间
  | 'DELETE_ITEM'         // 删除行程项
  | 'EXPORT_ITINERARY';   // 导出行程
```

### 2. 快捷操作处理流程

```
用户点击快捷操作按钮
    │
    ▼
handleQuickAction(action)
    │
    ▼
根据 action.action 类型处理：
    │
    ├─→ CLARIFY_INTENT
    │   └─→ 提取 clarificationData
    │       └─→ sendMessage(action.label, { clarificationData })
    │
    ├─→ APPLY_SUGGESTION
    │   └─→ 如果有 pendingChanges
    │       └─→ confirmChanges([changeId])
    │
    ├─→ QUERY_MORE
    │   └─→ sendMessage(action.label)
    │
    └─→ 其他操作
        └─→ sendMessage(action.label)
```

**关键代码：**

```typescript
// TripPlannerAssistant.tsx
const handleQuickAction = useCallback(async (action: QuickAction) => {
  if (loading) return;
  
  switch (action.action) {
    case 'CLARIFY_INTENT':
      // 提取澄清数据
      const clarificationData = {
        selectedAction: action.data?.selectedAction,
        params: action.data?.params,
      };
      
      // 发送澄清选择
      await sendMessage(action.label, { clarificationData });
      break;
      
    case 'APPLY_SUGGESTION':
      // 如果有待确认的修改，应用第一个
      if (pendingChanges.length > 0) {
        await confirmChanges([pendingChanges[0].id]);
      }
      break;
      
    default:
      // 其他操作直接发送消息
      await sendMessage(action.label);
  }
}, [sendMessage, loading, pendingChanges, confirmChanges]);
```

### 3. 快捷命令条（QuickCommandsBar）

**功能：**
- 根据是否有上下文显示不同的快捷命令
- 有上下文时：显示"附近餐厅"、"停留时间"、"注意事项"
- 无上下文时：显示通用命令（"优化行程"、"细化安排"等）

**显示逻辑：**

```typescript
// QuickCommandsBar.tsx
const commands = useMemo(() => {
  if (context?.itemId && context?.placeName) {
    // 有上下文：显示上下文相关命令
    return [
      { label: '附近餐厅', command: `附近有什么餐厅？` },
      { label: '停留时间', command: `这里建议停留多久？` },
      { label: '注意事项', command: `有什么注意事项？` },
    ];
  } else {
    // 无上下文：显示通用命令
    return [
      { label: '优化行程', command: '优化行程' },
      { label: '细化安排', command: '细化安排' },
      // ...
    ];
  }
}, [context]);
```

---

## 修改确认流程

### 1. 待确认修改（PendingChanges）

**数据结构：**

```typescript
interface PendingChange {
  id: string;
  type: 'ADD' | 'DELETE' | 'MODIFY' | 'REORDER' | 'UPDATE';
  description: string;
  targetDay?: number;
  targetItemId?: string;
  // ... 其他字段
}
```

### 2. 修改确认流程

```
助手返回 pendingChanges
    │
    ▼
显示 PendingChangesPanel
    │
    ├─→ 用户点击"确认"
    │   └─→ confirmChanges([changeId])
    │       └─→ POST /trip-planner/apply-suggestion
    │           └─→ 后端应用修改
    │               └─→ 返回 tripUpdate
    │                   └─→ onTripUpdate() 通知父组件
    │                       └─→ 刷新行程数据
    │
    └─→ 用户点击"拒绝"
        └─→ rejectChanges()
            └─→ 清空 pendingChanges
```

**关键代码：**

```typescript
// useTripPlannerAssistant.ts
const confirmChanges = useCallback(async (changeIds?: string[]) => {
  if (!sessionId || pendingChanges.length === 0) return;
  
  const changesToApply = changeIds 
    ? pendingChanges.filter(c => changeIds.includes(c.id))
    : pendingChanges;
  
  setLoading(true);
  
  try {
    for (const change of changesToApply) {
      await tripPlannerApi.applySuggestion({
        sessionId,
        suggestionId: change.id,
        // ... 其他参数
      });
    }
    
    // 清空待确认修改
    setPendingChanges([]);
    
    // 发送确认消息
    await sendMessage('已确认修改');
  } catch (err) {
    handleError(err as Error);
  } finally {
    setLoading(false);
  }
}, [sessionId, pendingChanges, sendMessage]);
```

### 3. 撤销操作

**流程：**

```
用户点击"撤销"按钮
    │
    ▼
undoLastChange()
    │
    ▼
POST /trip-planner/undo
  Body: { sessionId }
    │
    ▼
后端撤销上一次修改
    │
    ▼
返回撤销结果
    │
    ▼
刷新消息列表（可选）
    │
    ▼
通知父组件刷新行程数据
```

---

## 意图消歧系统

### 1. 意图不明确场景

**触发条件：**
- 后端返回 `meta.uncertainty = 'AMBIGUOUS_ACTION'`
- 用户问题可能对应多个操作（查询 vs 添加）

**流程：**

```
用户发送消息："附近有什么餐厅？"
    │
    ▼
后端检测到意图不明确
    │
    ▼
返回澄清选项：
  {
    quickActions: [
      { id: 'just_query', label: '只是了解一下', action: 'CLARIFY_INTENT', data: { selectedAction: 'QUERY' } },
      { id: 'add_to_itinerary', label: '帮我加到行程里', action: 'CLARIFY_INTENT', data: { selectedAction: 'ADD_TO_ITINERARY' } }
    ],
    meta: { uncertainty: 'AMBIGUOUS_ACTION' }
  }
    │
    ▼
显示澄清选项按钮
    │
    ▼
用户点击其中一个选项
    │
    ▼
handleQuickAction() 提取 clarificationData
    │
    ▼
sendMessage() 发送澄清选择
    │
    ▼
后端根据 selectedAction 处理：
  - QUERY: 只返回信息，不修改行程
  - ADD_TO_ITINERARY: 返回信息 + 生成 pendingChanges
```

**关键代码：**

```typescript
// TripPlannerAssistant.tsx
const handleClarificationSelect = useCallback(async (
  action: QuickAction,
  question?: string
) => {
  // 提取澄清数据
  const clarificationData = {
    selectedAction: action.data?.selectedAction,
    params: action.data?.params,
  };
  
  // 如果没有 selectedAction，尝试从 params 推断
  if (!clarificationData.selectedAction && action.data?.params) {
    if (action.data.params.dayNumber || action.data.params.gapId) {
      clarificationData.selectedAction = 'ADD_TO_ITINERARY';
    }
  }
  
  // 发送澄清选择
  await sendMessage(question || action.label, { clarificationData });
}, [sendMessage]);
```

---

## 三人格守护者系统

### 1. 人格角色

- **🐻‍❄️ 阿布（Abu）**：安全守护者
  - 检测距离冲突、时间冲突、高风险区域
  - 风险等级：HIGH / MEDIUM / LOW

- **🐕 德雷医生（DrDre）**：节奏设计师
  - 评估疲劳度、节奏合理性
  - 疲劳评分：0-100

- **🐬 海王星（Neptune）**：体验优化师
  - 提供替代方案、优化建议
  - 体验评分：0-100

### 2. 人格洞察显示

**流程：**

```
助手返回 personaInsights
    │
    ▼
显示 GuardianPanel
    │
    ├─→ 显示每个角色的洞察
    │   ├─→ 消息（message）
    │   ├─→ 建议（suggestion）
    │   └─→ 详情（details）
    │
    └─→ 用户可以选择隐藏某个角色
        └─→ togglePersona(persona)
            └─→ 更新 hiddenPersonas
```

**关键代码：**

```typescript
// TripPlannerAssistant.tsx
const [hiddenPersonas, setHiddenPersonas] = useState<Set<string>>(new Set());

const togglePersona = useCallback((persona: string) => {
  setHiddenPersonas(prev => {
    const next = new Set(prev);
    if (next.has(persona)) {
      next.delete(persona);
    } else {
      next.add(persona);
    }
    return next;
  });
}, []);
```

### 3. 免责声明（Disclaimer）

**显示条件：**
- 后端返回 `disclaimer` 字段
- 通常在高风险场景下显示

**显示位置：**
- 在消息下方显示 DisclaimerBanner

---

## 富内容展示

### 1. 富内容类型

```typescript
type RichContentType =
  | 'timeline'           // 时间线
  | 'comparison'         // 对比表
  | 'checklist'          // 清单
  | 'poi_recommendation' // POI 推荐
  | 'gap_highlight';     // 间隙高亮
```

### 2. 富内容渲染

**TimelineRichContent：**
- 显示多天的行程时间线
- 每个活动显示时间、地点、类型

**ComparisonRichContent：**
- 显示多个方案的对比表
- 支持选择方案

**ChecklistRichContent：**
- 显示待办清单
- 支持勾选完成

**POIRichContent：**
- 显示 POI 推荐卡片
- 支持一键添加到行程

**GapHighlightRichContent：**
- 高亮显示行程间隙
- 显示间隙类型、时间、严重程度

### 3. 间隙检测面板（DetectedGapsPanel）

**功能：**
- 显示后端检测到的行程间隙（用餐、住宿等）
- 支持一键填充间隙

**数据结构：**

```typescript
interface DetectedGap {
  id: string;
  type: 'MEAL' | 'HOTEL' | 'TRANSIT' | 'ACTIVITY';
  dayNumber: number;
  timeSlot: { start: string; end: string };
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  context?: {
    beforeItem?: string;
    afterItem?: string;
    nearbyLocation?: string;
  };
}
```

---

## 错误处理与恢复

### 1. 错误类型

- **网络错误**：API 请求失败
- **会话错误**：sessionId 无效
- **验证错误**：后端返回验证失败

### 2. 错误处理流程

```
API 请求失败
    │
    ▼
catch 错误
    │
    ▼
handleError(err)
    │
    ├─→ 设置 error 状态
    │
    ├─→ 调用 onError 回调（如果提供）
    │
    └─→ console.error 记录错误
    │
    ▼
显示错误提示
    │
    ├─→ 用户点击"重试"
    │   └─→ 重新发送请求
    │
    └─→ 用户继续操作
        └─→ 错误提示自动消失
```

### 3. 会话恢复

**场景：**
- 页面刷新后，sessionId 丢失
- 自动重新启动会话

**流程：**

```
页面刷新
    │
    ▼
组件重新挂载
    │
    ▼
useTripPlannerAssistant 初始化
    │
    ▼
检测到 sessionId === null && autoStart === true
    │
    ▼
自动调用 startSession()
    │
    ▼
创建新会话
```

---

## 状态同步机制

### 1. 左侧 → 右侧

**流程：**

```
左侧操作（选择天数/行程项）
    │
    ▼
PlanStudioContext 更新 selectedContext
    │
    ▼
TripPlannerAssistant 订阅 selectedContext
    │
    ▼
显示 ContextStatusBar 和 SelectedItemCard
    │
    ▼
用户发送消息时，自动携带上下文
```

### 2. 右侧 → 左侧

**流程：**

```
助手返回 tripUpdate
    │
    ▼
onTripUpdate() 回调
    │
    ▼
父组件刷新行程数据
    │
    ▼
左侧视图自动更新
```

### 3. 双向联动

**场景：**
- 用户点击"问NARA"按钮
- 自动打开侧边栏（如果关闭）
- 自动发送问题
- 自动携带上下文

**流程：**

```
用户点击"问NARA"按钮
    │
    ▼
planStudioActions.askAssistantAbout(question, context)
    │
    ├─→ onOpenAssistant() // 打开侧边栏
    │
    └─→ onAskAssistant(question, context) // 发送消息
        │
        ▼
助手接收消息并处理
        │
        ▼
返回回复（可能包含 pendingChanges）
        │
        ▼
用户确认修改
        │
        ▼
onTripUpdate() 通知父组件
        │
        ▼
左侧视图刷新
```

---

## 总结

规划工作台右侧助手对话框的核心交互逻辑包括：

1. **会话管理**：自动启动、重置、恢复
2. **消息交互**：用户发送消息 → 后端处理 → 显示回复
3. **上下文传递**：左侧操作 → 更新上下文 → 发送消息时携带
4. **快捷操作**：澄清意图、应用建议、查询更多
5. **修改确认**：显示待确认修改 → 用户确认/拒绝 → 应用修改
6. **意图消歧**：检测意图不明确 → 显示澄清选项 → 用户选择
7. **守护者系统**：显示三人格洞察 → 用户可选择隐藏
8. **富内容展示**：时间线、对比表、清单、POI推荐
9. **错误处理**：捕获错误 → 显示提示 → 支持重试
10. **状态同步**：左侧 ↔ 右侧双向联动

所有交互都围绕"上下文感知"和"双向联动"两个核心原则，确保用户能够流畅地使用助手功能。
