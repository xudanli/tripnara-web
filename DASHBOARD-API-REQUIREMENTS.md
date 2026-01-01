# Dashboard 页面后端接口需求

## 📋 当前状态

### ✅ 已有接口（可直接使用）

1. **行程列表**
   - `GET /trips` - 获取所有行程列表
   - `GET /trips/:id` - 获取行程详情

2. **国家信息**
   - `GET /countries` - 获取国家列表

---

## 🆕 需要新增的接口

### 1. 获取三人格提醒（Persona Alerts）

**接口**: `GET /trips/:id/persona-alerts`

**描述**: 获取当前行程的三人格（Abu、Dr.Dre、Neptune）提醒列表

**路径参数**:
- `id` (string): 行程 ID

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-1",
      "persona": "ABU",
      "name": "Abu",
      "title": "安全官（PHYSICAL）",
      "message": "我注意到北部山区 10 月份道路封闭概率较高\n建议准备备选路线\n你觉得呢？",
      "severity": "warning",
      "createdAt": "2024-12-30T10:00:00Z",
      "metadata": {
        "riskType": "ROAD_CLOSURE",
        "location": "北部山区",
        "month": 10
      }
    },
    {
      "id": "alert-2",
      "persona": "DR_DRE",
      "name": "Dr.Dre",
      "title": "节奏官（HUMAN）",
      "message": "第 5 天行程稍密集\n如果你想更轻松，我建议拆成两天\n这样会舒服一点",
      "severity": "info",
      "createdAt": "2024-12-30T09:00:00Z",
      "metadata": {
        "day": 5,
        "suggestion": "SPLIT_DAY"
      }
    },
    {
      "id": "alert-3",
      "persona": "NEPTUNE",
      "name": "Neptune",
      "title": "修复官（PHILOSOPHY + SPATIAL）",
      "message": "我找到一个替代方案\n它可以保留原路线的观光体验\n替代原 Day 4 B 点\n要试试吗？",
      "severity": "success",
      "createdAt": "2024-12-30T08:00:00Z",
      "metadata": {
        "replacementDay": 4,
        "preservesExperience": true
      }
    }
  ]
}
```

**TypeScript 类型**:
```typescript
interface PersonaAlert {
  id: string;
  persona: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  name: string;
  title: string;
  message: string;
  severity: 'warning' | 'info' | 'success';
  createdAt: string;
  metadata?: Record<string, any>;
}
```

---

### 2. 获取决策记录/透明日志（Decision Log）

**接口**: `GET /trips/:id/decision-log`

**描述**: 获取行程的决策记录，用于透明日志展示

**路径参数**:
- `id` (string): 行程 ID

**查询参数**:
- `limit` (number, 可选): 返回记录数量，默认 10
- `offset` (number, 可选): 偏移量，默认 0

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "log-1",
        "date": "2024-12-30T10:00:00Z",
        "description": "依据道路通行记录进行了风险提示",
        "source": "PHYSICAL",
        "persona": "ABU",
        "action": "RISK_WARNING",
        "metadata": {
          "roadId": "F26",
          "riskLevel": "MEDIUM"
        }
      },
      {
        "id": "log-2",
        "date": "2024-12-28T14:00:00Z",
        "description": "调整节奏建议",
        "source": "HUMAN",
        "persona": "DR_DRE",
        "action": "PACING_ADJUSTMENT",
        "metadata": {
          "day": 5,
          "originalDuration": 8,
          "suggestedDuration": 6
        }
      }
    ],
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

**TypeScript 类型**:
```typescript
interface DecisionLogEntry {
  id: string;
  date: string;
  description: string;
  source: 'PHYSICAL' | 'HUMAN' | 'PHILOSOPHY' | 'SPATIAL';
  persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  action: string;
  metadata?: Record<string, any>;
}

interface DecisionLogResponse {
  items: DecisionLogEntry[];
  total: number;
  limit: number;
  offset: number;
}
```

---

### 3. 获取今日重点任务（Today's Tasks）

**接口**: `GET /trips/:id/tasks`

**描述**: 获取系统推荐的今日重点任务列表

**路径参数**:
- `id` (string): 行程 ID

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "task-1",
      "text": "确认你能接受的最长驾驶时长",
      "completed": false,
      "priority": "high",
      "category": "PREFERENCE",
      "route": "/dashboard/trips/{tripId}",
      "metadata": {
        "relatedField": "maxDrivingHours"
      }
    },
    {
      "id": "task-2",
      "text": "选择第 5 天住宿位置偏好",
      "completed": false,
      "priority": "medium",
      "category": "SCHEDULE",
      "route": "/dashboard/trips/{tripId}/schedule",
      "metadata": {
        "day": 5
      }
    },
    {
      "id": "task-3",
      "text": "查看 F26 道路通行建议",
      "completed": false,
      "priority": "high",
      "category": "SAFETY",
      "route": "/dashboard/trips/{tripId}/decision",
      "metadata": {
        "roadId": "F26"
      }
    }
  ]
}
```

**TypeScript 类型**:
```typescript
interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'PREFERENCE' | 'SCHEDULE' | 'SAFETY' | 'BUDGET' | 'OTHER';
  route?: string;
  metadata?: Record<string, any>;
}
```

**更新任务状态接口**: `PATCH /trips/:id/tasks/:taskId`
```json
{
  "completed": true
}
```

---

### 4. 获取工作流 Pipeline 状态（可选优化）

**接口**: `GET /trips/:id/pipeline-status`

**描述**: 获取行程的工作流 Pipeline 各阶段状态（可选，当前前端可以根据行程数据计算）

**路径参数**:
- `id` (string): 行程 ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "id": "1",
        "name": "明确旅行目标",
        "status": "completed",
        "completedAt": "2024-12-25T10:00:00Z"
      },
      {
        "id": "2",
        "name": "判断路线是否成立",
        "status": "completed",
        "completedAt": "2024-12-26T14:00:00Z"
      },
      {
        "id": "3",
        "name": "生成可执行日程",
        "status": "in-progress",
        "summary": "建议驾驶时长：每天 3–5 小时\n疲劳指数：中\n🚨 第 5 天稍紧张"
      },
      {
        "id": "4",
        "name": "风险评估与缓冲",
        "status": "pending"
      },
      {
        "id": "5",
        "name": "Plan B 备选系统",
        "status": "pending"
      },
      {
        "id": "6",
        "name": "行前准备清单",
        "status": "pending"
      }
    ]
  }
}
```

**TypeScript 类型**:
```typescript
interface PipelineStage {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'risk';
  completedAt?: string;
  summary?: string;
}

interface PipelineStatusResponse {
  stages: PipelineStage[];
}
```

---

## 🔄 可能需要修改的接口

### 1. 行程详情接口增强

**当前**: `GET /trips/:id`

**建议**: 在响应中增加以下字段（如果还没有）：
- `pipelineStatus`: Pipeline 各阶段状态
- `activeAlertsCount`: 当前活跃的提醒数量
- `pendingTasksCount`: 待完成任务数量

---

## 📝 优先级建议

### 高优先级（必须实现）
1. ✅ **获取三人格提醒** - `GET /trips/:id/persona-alerts`
   - Dashboard 核心功能，需要真实数据

2. ✅ **获取决策记录** - `GET /trips/:id/decision-log`
   - 透明日志是 TripNARA 的核心价值

### 中优先级（建议实现）
3. ⚠️ **获取今日任务** - `GET /trips/:id/tasks`
   - 提升用户体验，但可以先用前端逻辑

4. ⚠️ **更新任务状态** - `PATCH /trips/:id/tasks/:taskId`
   - 如果实现了任务接口，需要支持状态更新

### 低优先级（可选）
5. 💡 **Pipeline 状态接口** - `GET /trips/:id/pipeline-status`
   - 当前前端可以根据行程数据计算，但后端提供会更准确

---

## 🔗 相关现有接口参考

- 决策引擎接口已在 `src/api/decision.ts` 中定义
- 操作历史接口：`GET /trips/:id/actions`（可用于决策记录）
- 行程状态接口：`GET /trips/:id/state`（可用于 Pipeline 状态）

---

## 💡 实现建议

1. **三人格提醒**：可以基于决策引擎的结果生成，调用决策接口后生成提醒
2. **决策记录**：可以复用现有的 `GET /trips/:id/actions` 接口，或者基于它扩展
3. **今日任务**：可以基于行程状态和用户偏好智能生成

