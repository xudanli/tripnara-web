# Trip Planner API 增强文档 - 左右联动与意图消歧

> 版本: v1.1.0  
> 更新日期: 2026-01-17  
> 状态: 待实现

---

## 📋 概述

本文档描述 Trip Planner API 的增强需求，主要包括：

1. **上下文感知对话** - 让 AI 知道用户当前查看的行程内容
2. **意图消歧系统** - 智能识别模糊意图，主动发现行程缺口
3. **建议应用闭环** - 支持将 AI 建议一键应用到行程

---

## 🔄 变更概览

| 接口 | 变更类型 | 说明 |
|------|---------|------|
| `POST /trip-planner/chat` | **增强** | 请求增加上下文字段，响应增加意图消歧字段 |
| `POST /trip-planner/start` | **增强** | 响应增加意图消歧字段 |
| `POST /trip-planner/apply-suggestion` | **新增** | 应用 AI 建议到行程 |

---

## 📝 接口详情

### 1. 对话接口增强

#### POST /trip-planner/chat

##### 请求变更

```typescript
interface PlannerChatRequest {
  tripId: string;
  message: string;
  sessionId?: string;
  
  // ========== 现有字段（保持兼容） ==========
  targetDay?: number;
  targetItemId?: string;
  
  // ========== 🆕 上下文增强 ==========
  context?: {
    /**
     * 用户当前选中的上下文
     * 来源：前端 PlanStudioContext
     */
    selectedContext?: {
      /** 选中的天数 (1-based) */
      dayIndex?: number;
      /** 选中的日期 */
      date?: string;
      /** 选中的行程项 ID */
      itemId?: string;
      /** 选中的地点名称 */
      placeName?: string;
      /** 选中的行程项类型 */
      itemType?: 'ACTIVITY' | 'TRANSIT' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST';
    };
    
    /**
     * 前后衔接信息
     * 用于 AI 理解时间窗口和路线连贯性
     */
    adjacentItems?: {
      /** 前一个行程项 */
      prevItem?: {
        name: string;
        endTime: string;  // ISO 8601
        type?: string;
      };
      /** 后一个行程项 */
      nextItem?: {
        name: string;
        startTime: string;  // ISO 8601
        type?: string;
      };
    };
    
    /**
     * 当天统计
     * 用于 AI 判断行程完整性
     */
    dayStats?: {
      totalItems: number;
      hasMeal: boolean;
      hasTransit: boolean;
      freeSlots?: Array<{
        start: string;  // HH:mm
        end: string;    // HH:mm
      }>;
    };
    
    // 保留现有字段
    currentLocation?: {
      lat: number;
      lng: number;
    };
    timezone?: string;
    language?: 'zh' | 'en';
  };
  
  // ========== 🆕 澄清选择数据 ==========
  /**
   * 当用户选择澄清选项时携带
   */
  clarificationData?: {
    /** 选择的动作类型 */
    selectedAction?: 'QUERY' | 'ADD_TO_ITINERARY' | 'REPLACE' | 'REMOVE' | 'MODIFY';
    /** 目标参数 */
    params?: {
      dayNumber?: number;
      timeSlot?: { start: string; end: string };
      targetItemId?: string;
      gapId?: string;
    };
  };
}
```

##### 响应变更

```typescript
interface PlannerChatResponse {
  sessionId: string;
  message: string;
  phase: PlannerPhase;
  intent: PlannerIntent;
  
  // ========== 现有字段（保持兼容） ==========
  richContent?: RichContent;
  quickActions?: QuickAction[];
  pendingChanges?: PendingChange[];
  tripUpdate?: TripUpdateSummary;
  followUp?: FollowUp;
  personaInsights?: PersonaInsight[];
  guardianEvaluation?: GuardianEvaluation;
  disclaimer?: Disclaimer;
  
  // ========== 🆕 元数据增强 ==========
  meta?: {
    processingTime?: number;
    guardiansInvoked?: GuardianPersona[];
    
    /** 🆕 意图不确定性类型 */
    uncertainty?: IntentUncertainty;
    
    /** 🆕 检测到的行程缺口 */
    detectedGaps?: ItineraryGap[];
  };
}
```

---

### 2. 新增枚举与类型

#### IntentUncertainty - 意图不确定性

```typescript
enum IntentUncertainty {
  /** 意图明确，可直接执行 */
  CLEAR = 'CLEAR',
  
  /** 动作不明确：查询 vs 添加 */
  AMBIGUOUS_ACTION = 'AMBIGUOUS_ACTION',
  
  /** 目标不明确：加到哪里 */
  AMBIGUOUS_TARGET = 'AMBIGUOUS_TARGET',
  
  /** 需求不明确：为什么要这个 */
  AMBIGUOUS_NEED = 'AMBIGUOUS_NEED',
  
  /** 多重意图：用户想做多件事 */
  MULTIPLE_INTENTS = 'MULTIPLE_INTENTS',
}
```

#### ItineraryGap - 行程缺口

```typescript
interface ItineraryGap {
  /** 缺口 ID */
  id: string;
  
  /** 缺口类型 */
  type: 'MEAL' | 'HOTEL' | 'TRANSPORT' | 'ACTIVITY' | 'FREE_TIME';
  
  /** 所在天数 (1-based) */
  dayNumber: number;
  
  /** 时间段 */
  timeSlot: {
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
  
  /** 描述 */
  description: string;
  
  /** 严重程度 */
  severity: 'CRITICAL' | 'SUGGESTED' | 'OPTIONAL';
  
  /** 前后行程项（用于位置参考） */
  context?: {
    beforeItem?: string;  // 前一个行程项名称
    afterItem?: string;   // 后一个行程项名称
    nearbyLocation?: string;  // 附近位置
  };
}
```

#### QuickAction 扩展

```typescript
interface QuickAction {
  id: string;
  label: string;
  
  /** 🆕 选项描述（用于澄清按钮） */
  description?: string;
  
  /** 动作类型（新增 CLARIFY_INTENT） */
  action: QuickActionType | 'CLARIFY_INTENT';
  
  style: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  
  /** 🆕 澄清选择数据 */
  data?: {
    selectedAction?: 'QUERY' | 'ADD_TO_ITINERARY' | 'REPLACE' | 'REMOVE' | 'MODIFY';
    params?: {
      dayNumber?: number;
      timeSlot?: { start: string; end: string };
      targetItemId?: string;
      gapId?: string;
    };
  };
}
```

#### RichContent 扩展

```typescript
// 新增缺口高亮类型
interface GapHighlightRichContent {
  type: 'gap_highlight';
  data: {
    highlight: {
      type: 'gap';
      dayNumber: number;
      timeSlot: {
        start: string;  // HH:mm
        end: string;    // HH:mm
      };
      gapType?: 'MEAL' | 'HOTEL' | 'TRANSPORT' | 'ACTIVITY' | 'FREE_TIME';
      description: string;
      severity: 'CRITICAL' | 'SUGGESTED' | 'OPTIONAL';
    };
  };
}

// RichContent 联合类型扩展
type RichContent = 
  | TimelineRichContent
  | ComparisonRichContent
  | ChecklistRichContent
  | POIRichContent
  | GapHighlightRichContent;  // 🆕
```

#### FollowUp 扩展

```typescript
interface FollowUp {
  question: string;
  questionCN?: string;
  options?: string[];
  optionsCN?: string[];
  
  /** 类型（新增 confirm） */
  type: 'single' | 'multiple' | 'text' | 'confirm';
}
```

---

### 3. 新增接口：应用建议

#### POST /trip-planner/apply-suggestion

将 AI 建议应用到行程（一键添加）。

##### 请求

```typescript
interface ApplySuggestionRequest {
  tripId: string;
  sessionId: string;
  
  /** 建议 ID */
  suggestionId: string;
  
  /** 目标天数 (1-based) */
  targetDay: number;
  
  /** 时间段（可选，未提供则自动安排） */
  timeSlot?: {
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
  
  /** 建议类型 */
  suggestionType: 'add_place' | 'modify_time' | 'add_meal' | 'optimize_route';
  
  /** 地点信息（add_place 时必填） */
  place?: {
    name: string;
    nameCN?: string;
    placeId?: number;
    category?: string;
    address?: string;
  };
}
```

##### 响应

```typescript
interface ApplySuggestionResponse {
  success: boolean;
  message: string;
  
  /** 创建/修改的行程项 */
  item?: {
    id: string;
    tripDayId: string;
    startTime: string;
    endTime: string;
    type: string;
    placeId?: number;
  };
  
  /** 行程更新摘要 */
  tripUpdate?: TripUpdateSummary;
  
  /** 后续建议 */
  followUpSuggestions?: string[];
}
```

##### 错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_SUGGESTION` | 建议 ID 无效或已过期 |
| `TIME_CONFLICT` | 时间段冲突 |
| `DAY_NOT_FOUND` | 目标天数不存在 |
| `PLACE_NOT_FOUND` | 地点不存在 |

---

## 📊 响应示例

### 示例 1：意图模糊 - 需要澄清动作

**用户输入：** "附近有什么好吃的"

**上下文：** 用户正在查看第1天，午餐时段(11:30-14:00)未安排

```json
{
  "sessionId": "planner_trip001_abc123",
  "message": "我注意到第1天午餐(11:30-14:00)还没安排。您是想了解附近餐厅信息，还是想让我帮您安排进行程呢？",
  "phase": "DETAILING",
  "intent": "ASK_QUESTION",
  "richContent": {
    "type": "gap_highlight",
    "data": {
      "highlight": {
        "type": "gap",
        "dayNumber": 1,
        "timeSlot": { "start": "11:30", "end": "14:00" },
        "gapType": "MEAL",
        "description": "第1天午餐未安排（11:30-14:00）",
        "severity": "CRITICAL"
      }
    }
  },
  "quickActions": [
    {
      "id": "just_query",
      "label": "只是了解一下",
      "action": "CLARIFY_INTENT",
      "data": { "selectedAction": "QUERY" },
      "style": "secondary"
    },
    {
      "id": "add_to_gap",
      "label": "帮我安排午餐",
      "description": "添加到第1天 11:30-14:00",
      "action": "CLARIFY_INTENT",
      "data": {
        "selectedAction": "ADD_TO_ITINERARY",
        "params": {
          "dayNumber": 1,
          "timeSlot": { "start": "11:30", "end": "14:00" },
          "gapId": "gap_meal_1_lunch"
        }
      },
      "style": "primary"
    }
  ],
  "followUp": {
    "question": "您是想了解附近餐厅信息，还是想让我帮您安排进行程呢？",
    "options": ["只是了解一下", "帮我安排午餐"],
    "type": "single"
  },
  "meta": {
    "processingTime": 245,
    "uncertainty": "AMBIGUOUS_ACTION",
    "detectedGaps": [
      {
        "id": "gap_meal_1_lunch",
        "type": "MEAL",
        "dayNumber": 1,
        "timeSlot": { "start": "11:30", "end": "14:00" },
        "description": "第1天午餐未安排",
        "severity": "CRITICAL",
        "context": {
          "beforeItem": "浅草寺",
          "afterItem": "秋叶原",
          "nearbyLocation": "浅草寺附近"
        }
      }
    ]
  }
}
```

### 示例 2：上下文感知对话

**请求：**
```json
{
  "tripId": "trip_001",
  "sessionId": "planner_trip001_abc123",
  "message": "这里停留多久合适？",
  "context": {
    "selectedContext": {
      "dayIndex": 1,
      "date": "2026-03-01",
      "itemId": "item_浅草寺",
      "placeName": "浅草寺",
      "itemType": "ACTIVITY"
    },
    "adjacentItems": {
      "prevItem": {
        "name": "酒店出发",
        "endTime": "2026-03-01T09:00:00.000Z",
        "type": "TRANSIT"
      },
      "nextItem": {
        "name": "午餐",
        "startTime": "2026-03-01T12:00:00.000Z",
        "type": "MEAL_ANCHOR"
      }
    },
    "dayStats": {
      "totalItems": 5,
      "hasMeal": true,
      "hasTransit": true,
      "freeSlots": []
    }
  }
}
```

**响应：**
```json
{
  "sessionId": "planner_trip001_abc123",
  "message": "浅草寺是东京最古老的寺庙，建议停留 **2-3小时**。\n\n根据您的行程，您在09:00到达，12:00需要去午餐，时间刚好合适！\n\n建议参观顺序：\n1. 雷门拍照 (15分钟)\n2. 仲见世商店街 (30分钟)\n3. 主殿参拜 (20分钟)\n4. 五重塔 (15分钟)\n5. 浅草神社 (20分钟)",
  "phase": "CONSULTING",
  "intent": "ASK_QUESTION",
  "meta": {
    "processingTime": 312,
    "uncertainty": "CLEAR"
  }
}
```

### 示例 3：应用建议

**请求：**
```json
{
  "tripId": "trip_001",
  "sessionId": "planner_trip001_abc123",
  "suggestionId": "suggestion_ramen_001",
  "targetDay": 1,
  "timeSlot": { "start": "12:00", "end": "13:00" },
  "suggestionType": "add_place",
  "place": {
    "name": "一兰拉面",
    "nameCN": "一兰拉面",
    "placeId": 12345,
    "category": "RESTAURANT",
    "address": "东京都台东区浅草1-2-3"
  }
}
```

**响应：**
```json
{
  "success": true,
  "message": "已将「一兰拉面」添加到第1天 12:00-13:00",
  "item": {
    "id": "item_abc123",
    "tripDayId": "day_001",
    "startTime": "2026-03-01T12:00:00.000Z",
    "endTime": "2026-03-01T13:00:00.000Z",
    "type": "MEAL_ANCHOR",
    "placeId": 12345
  },
  "tripUpdate": {
    "totalChanges": 1,
    "addedItems": 1,
    "removedItems": 0,
    "modifiedItems": 0,
    "affectedDays": [1]
  },
  "followUpSuggestions": [
    "需要我帮您规划从浅草寺到一兰拉面的交通吗？",
    "午餐后要去哪里？秋叶原距离很近"
  ]
}
```

---

## 🔍 缺口检测规则

### 用餐缺口检测

| 餐次 | 检测时间段 | 严重程度 |
|------|-----------|---------|
| 早餐 | 07:00 - 09:30 | SUGGESTED |
| 午餐 | 11:30 - 14:00 | CRITICAL |
| 晚餐 | 17:30 - 20:30 | CRITICAL |

### 住宿缺口检测

- 除最后一天外，每天应有住宿安排
- 严重程度：CRITICAL

### 交通缺口检测

- 相邻 POI 距离 > 2km 且无交通安排
- 严重程度：SUGGESTED

### 空闲时间检测

- 活动间隔 > 2小时
- 严重程度：OPTIONAL

---

## 📱 前端已实现

以下功能前端已实现，等待后端支持：

### 1. 类型定义 (`src/api/trip-planner.ts`)
- ✅ `IntentUncertainty` 枚举
- ✅ `GapHighlightRichContent` 类型
- ✅ `QuickAction.data` 扩展
- ✅ `PlannerResponseMeta.uncertainty` 字段
- ✅ `PlannerChatRequest.clarificationData` 字段

### 2. UI 组件 (`src/components/trip-planner/TripPlannerAssistant.tsx`)
- ✅ `GapHighlightCard` - 缺口高亮卡片
- ✅ `ClarificationOptions` - 澄清选项按钮组
- ✅ `isClarificationResponse()` - 澄清响应识别
- ✅ `handleClarificationSelect()` - 澄清选择处理
- ✅ `handleClarificationFreeText()` - 自由文本处理

### 3. 上下文传递 (`src/contexts/PlanStudioContext.tsx`)
- ✅ `SelectedContext` 状态管理
- ✅ `selectDay()` / `selectItineraryItem()` 选择方法
- ✅ `adjacentItems` / `dayStats` 计算（部分）

---

## 📈 埋点事件

| 事件名 | 触发时机 | 参数 |
|--------|---------|------|
| `clarification_shown` | 展示澄清问题 | `{ sessionId, uncertainty, gapType?, optionCount }` |
| `clarification_option_selected` | 用户选择选项 | `{ sessionId, optionId, selectedAction }` |
| `clarification_freetext_submitted` | 用户输入自由文本 | `{ sessionId, textLength }` |
| `gap_discovered` | 发现行程缺口 | `{ sessionId, gapType, severity, dayNumber }` |
| `gap_filled` | 缺口被填补 | `{ sessionId, gapId, method: 'auto' \| 'manual' }` |
| `suggestion_applied` | 建议被应用 | `{ sessionId, suggestionId, suggestionType }` |
| `context_passed` | 上下文被传递 | `{ sessionId, hasSelectedContext, hasDayStats }` |

---

## ⚠️ 兼容性说明

1. **向后兼容** - 所有新增字段均为可选，不影响现有功能
2. **渐进增强** - 前端已做空值处理，后端可逐步实现
3. **降级策略** - 后端不返回 `uncertainty` 时，前端视为 `CLEAR`

---

## 🔗 相关文档

- [意图消歧系统前端指南](./intent-disambiguation-frontend-guide.md)
- [Trip Planner 主接口文档](./api-documentation.md)
- [三人格系统前端指南](./frontend-integration-guide.md)
