# 规划助手 V2 智能对话 API 接口文档

> 前端对接文档：`POST /api/agent/planning-assistant/v2/chat`

## 1. 接口概览

| 项目 | 说明 |
|------|------|
| **URL** | `POST /api/agent/planning-assistant/v2/chat` |
| **鉴权** | 公开接口，无需 Bearer Token |
| **限流** | 生产环境 30 次/分钟，开发环境 300 次/分钟 |
| **Content-Type** | `application/json` |

---

## 2. 请求体 (ChatRequestDto)

```typescript
interface ChatRequestDto {
  sessionId: string;      // 必填，会话 ID（同一会话需保持一致以实现多轮对话）
  message: string;        // 必填，用户消息（支持自然语言）
  userId?: string;        // 可选，用户 ID
  language?: 'en' | 'zh'; // 可选，语言偏好，默认 'zh'
  options?: {
    autoRoute?: boolean;   // 可选，自动路由到业务接口，默认 true
    clarifyIntent?: boolean; // 可选，意图不明确时澄清，默认 true
    stream?: boolean;      // 可选，是否流式响应，默认 false
  };
  context?: {
    tripId?: string;      // 可选，行程 ID（规划工作台场景）
    countryCode?: string; // 可选，国家代码，如 'IS'
    timezone?: string;    // 可选，时区
    currentLocation?: { lat: number; lng: number }; // 可选，当前位置
  };
}
```

### 请求示例

```json
{
  "sessionId": "my-session-123",
  "message": "查询从柏林到慕尼黑的火车",
  "language": "zh"
}
```

---

## 3. 响应体 (ChatResponseDto)

### 3.1 通用字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | string | 回复消息（英文） |
| `messageCN` | string | 回复消息（中文） |
| `reply` | string | 主要回复（根据 language 自动选择） |
| `replyCN` | string | 主要回复（中文） |
| `phase` | string | 当前阶段（见下表） |
| `sessionId` | string | 会话 ID |
| `routing` | object | 智能路由信息 |
| `suggestedActions` | array | 建议操作（快捷按钮） |

### 3.2 phase 阶段枚举

| 值 | 说明 |
|----|------|
| `INITIAL` | 初始阶段 |
| `RECOMMENDING` | 推荐/查询结果阶段 |
| `PLANNING` | 方案生成阶段 |
| `CLARIFYING_HOTEL_DATES` | 追问酒店入住/退房日期 |
| `CLARIFYING_RAIL_DATES` | 追问铁路出行日期 |
| `COMPARING_PLANS` | 方案对比阶段 |
| `CONFIRMING` | 确认阶段 |
| `COMPLETED` | 完成阶段 |

### 3.3 routing 路由信息

```typescript
interface RoutingInfoDto {
  target: string;   // 路由目标：rail | hotel | flight | recommendations | ...
  reason: string;  // 路由原因
  params?: Record<string, any>;  // 提取的参数，如 { origin, destination, date }
}
```

### 3.4 suggestedActions 建议操作

```typescript
interface SuggestedActionDto {
  action: string;   // 操作标识，如 'rail_date-tomorrow'
  label: string;    // 标签（英文）
  labelCN: string;  // 标签（中文）
  params?: Record<string, any>;  // 可选参数
}
```

**前端用法**：用户点击建议操作时，将 `label` 或 `labelCN`（根据当前语言）作为 `message` 再次调用 chat 接口，**必须保持同一 `sessionId`**。

---

## 4. 按路由目标的响应字段

根据 `routing.target` 不同，响应中会包含不同的业务数据：

| target | 响应字段 | 说明 |
|--------|----------|------|
| `rail` | `railRoutes` | 铁路路线列表 |
| `recommendations` | `recommendations` | 目的地推荐列表 |
| `generate` | `plans` | 方案候选列表 |
| `hotel` / `accommodation` | `accommodations` | 住宿列表 |
| `flight` | `flights` | 航班列表 |
| `carRental` | `carRentals` | 租车列表 |
| `restaurant` | `restaurants` | 餐厅列表 |
| `weather` | `weather` | 天气信息 |

---

## 5. 铁路查询 (rail) 专项说明

### 5.1 用户输入格式

支持自然语言，系统会自动解析：

- **出发地、目的地**：`从X到Y`、`X到Y`、`from X to Y`
- **日期**（可选）：`明天`、`3月15日`、`March 15`、`tomorrow`

**示例**：
- `查询从柏林到慕尼黑的火车` → 会追问出行日期
- `查询明天从柏林到慕尼黑的火车` → 直接返回班次

**巴黎↔伦敦（Eurostar）**：DB 接口不支持该线路，返回引导卡片（`legs` 为空，`bookingUrl` 指向 eurostar.com），前端展示「预订」按钮即可。

### 5.2 日期澄清流程 (CLARIFYING_RAIL_DATES)

当用户**未提供日期**时：

1. 响应 `phase` 为 `CLARIFYING_RAIL_DATES`
2. 响应包含 `suggestedActions`，如 `[{ action: 'rail_date-tomorrow', label: 'Tomorrow', labelCN: '明天' }, ...]`
3. 前端展示回复 + 快捷按钮

**用户补充日期**：用户点击「明天」或输入「明天」后，**用同一 sessionId 再次调用**：

```json
{
  "sessionId": "my-session-123",
  "message": "明天",
  "language": "zh"
}
```

后端会合并之前的出发地、目的地，执行铁路搜索并返回 `railRoutes`。

### 5.3 railRoutes 数据结构

```typescript
interface RailRoute {
  origin: string;        // 出发站，如 "Berlin Hbf"
  destination: string;   // 到达站，如 "München Hbf"
  departure: string;     // 出发时间，ISO 8601，如 "2026-02-20T17:36:00+01:00"
  arrival: string;       // 到达时间
  duration?: number;     // 时长（分钟）
  price?: {
    amount: number;
    currency: string;    // 如 "EUR"
  };
  /** 预订链接。德国及欧洲 → bahn.de；巴黎↔伦敦 → eurostar.com */
  bookingUrl?: string;
  /** 巴黎↔伦敦时为引导卡片，legs 为空；德国线路有完整车次 */
  note?: string;
  legs: Array<{
    origin: { name: string; id?: string };
    destination: { name: string; id?: string };
    departure?: string;
    arrival?: string;
    departurePlatform?: string;
    arrivalPlatform?: string;
    line?: { name: string; productName?: string };  // 如 "ICE 1603"
    remarks?: Array<{ text: string; type: string; summary?: string }>;
    // ... 更多字段
  }>;
  /** 卡片操作（每张火车卡片需展示） */
  actions: Array<{
    action: 'view_rail_detail' | 'add_rail_to_itinerary' | 'book_rail';
    label: string;
    labelCN: string;
    params: { routeIndex: number; bookingUrl?: string };
  }>;
}
```

**卡片操作说明**：

| action | 说明 | 前端处理 |
|--------|------|----------|
| `view_rail_detail` | 查看详情 | 展开卡片或打开弹窗，展示 legs、remarks。巴黎↔伦敦时 legs 为空，可展示 note |
| `add_rail_to_itinerary` | 加入行程 | 调用 `POST /api/itinerary-items`。巴黎↔伦敦时需用 note 中的信息或仅添加 bookingUrl |
| `book_rail` | 预订 | 打开 `params.bookingUrl`（新窗口/标签页） |

### 5.4 将铁路路线加入行程（含跨夜火车）

铁路查询返回 `railRoutes` 后，前端可调用 `POST /api/itinerary-items` 将某条路线加入行程：

**请求体**（跨夜火车示例：22:00 出发、次日 06:00 到达）：
```json
{
  "tripDayId": "行程日ID（出发日）",
  "type": "TRANSIT",
  "startTime": "2026-02-20T22:00:00+01:00",
  "endTime": "2026-02-21T06:00:00+01:00",
  "placeName": "Berlin Hbf → München Hbf",
  "note": "ICE 1603，跨夜火车",
  "externalUrl": "https://www.bahn.de/buchung/fahrplan/suche?S=Berlin+Hbf&Z=München+Hbf&...",
  "metadata": { "source": "rail", "isOvernightRail": true, "lineName": "ICE 1603" },
  "costCategory": "TRANSPORTATION",
  "estimatedCost": 200.3,
  "currency": "EUR"
}
```

**说明**：`externalUrl` 可使用 `railRoutes[i].bookingUrl`，供行程项展示「预订」链接。

**跨夜火车说明**：
- `tripDayId` 使用**出发日**的 TripDay
- `startTime`、`endTime` 可为不同日期（如 22:00 Day1 → 06:00 Day2）
- `metadata.isOvernightRail: true` 供前端展示「跨夜」标识
- 系统支持 TRANSIT 类型跨夜行程，出发时间可晚至次日 06:00（以行程日 00:00 为基准）

### 5.5 铁路查询完整示例

**步骤 1：用户发起查询（无日期）**

```bash
curl -X POST "http://localhost:3000/api/agent/planning-assistant/v2/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "rail-session-001",
    "message": "查询从柏林到慕尼黑的火车",
    "language": "zh"
  }'
```

**响应**：
```json
{
  "message": "Please provide your travel date or time...",
  "messageCN": "请提供出行日期或时间，例如：「明天」「3月15日」...",
  "reply": "请提供出行日期或时间...",
  "replyCN": "请提供出行日期或时间...",
  "phase": "CLARIFYING_RAIL_DATES",
  "sessionId": "rail-session-001",
  "routing": {
    "target": "rail",
    "reason": "Awaiting travel date",
    "params": { "origin": "柏林", "destination": "慕尼黑" }
  },
  "suggestedActions": [
    { "action": "rail_date-tomorrow", "label": "Tomorrow", "labelCN": "明天" },
    { "action": "rail_date-day-after", "label": "Day after tomorrow", "labelCN": "后天" }
  ]
}
```

**步骤 2：用户选择「明天」**

```bash
curl -X POST "http://localhost:3000/api/agent/planning-assistant/v2/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "rail-session-001",
    "message": "明天",
    "language": "zh"
  }'
```

**响应**：
```json
{
  "message": "I found 10 rail routes from 柏林 to 慕尼黑.",
  "messageCN": "我为您找到了10条从柏林到慕尼黑的铁路路线。",
  "phase": "RECOMMENDING",
  "sessionId": "rail-session-001",
  "routing": { "target": "rail", "reason": "Rail search" },
  "railRoutes": [
    {
      "origin": "Berlin Hbf",
      "destination": "München Hbf",
      "departure": "2026-02-20T17:36:00+01:00",
      "arrival": "2026-02-20T21:43:00+01:00",
      "price": { "amount": 200.3, "currency": "EUR" },
      "legs": [...]
    }
  ]
}
```

---

## 6. 前端集成建议

### 6.1 会话管理

- 首次进入规划助手时，可调用 `POST /api/agent/planning-assistant/v2/sessions` 创建会话，或自行生成 `sessionId`（如 `uuid`）
- 同一会话内所有 chat 请求必须使用相同 `sessionId`

### 6.2 展示逻辑

```typescript
// 伪代码
const response = await chatApi({ sessionId, message, language });

// 1. 展示回复
displayMessage(response.reply ?? (language === 'zh' ? response.replyCN : response.message));

// 2. 根据 phase 处理
if (response.phase === 'CLARIFYING_RAIL_DATES') {
  showSuggestedActions(response.suggestedActions);  // 显示「明天」「后天」等按钮
}

// 3. 根据 routing.target 展示业务数据
if (response.routing?.target === 'rail' && response.railRoutes) {
  renderRailRoutes(response.railRoutes);
}
if (response.routing?.target === 'recommendations' && response.recommendations) {
  renderRecommendations(response.recommendations);
}
// ... 其他 target
```

### 6.3 建议操作点击

用户点击 `suggestedActions` 中的按钮时：

```typescript
function onSuggestedActionClick(action: SuggestedActionDto) {
  const message = language === 'zh' ? action.labelCN : action.label;
  chatApi({ sessionId, message, language });
}
```

### 6.4 错误处理

- 接口返回 4xx/5xx 时，按常规 HTTP 错误处理
- 业务错误（如铁路查询失败）会体现在 `message` / `messageCN` 中，`routing.target` 仍为 `rail`

---

## 7. 其他路由目标简要说明

| 目标 | 用户输入示例 | 响应字段 |
|------|--------------|----------|
| `recommendations` | 想去冰岛、推荐目的地 | `recommendations` |
| `generate` | 帮我规划冰岛 10 天行程 | `plans` |
| `hotel` | 冰岛雷克雅未克酒店 | `accommodations` |
| `flight` | 北京到伦敦的航班 | `flights` |
| `carRental` | 冰岛租车推荐 | `carRentals` |
| `weather` | 柏林天气 | `weather` |

---

## 8. 附录：完整 TypeScript 类型

```typescript
// 请求
interface ChatRequestDto {
  sessionId: string;
  message: string;
  userId?: string;
  language?: 'en' | 'zh';
  options?: { autoRoute?: boolean; clarifyIntent?: boolean; stream?: boolean };
  context?: { tripId?: string; countryCode?: string; timezone?: string };
}

// 响应
interface ChatResponseDto {
  message: string;
  messageCN: string;
  reply?: string;
  replyCN?: string;
  phase: string;
  sessionId?: string;
  routing?: { target: string; reason: string; params?: Record<string, any> };
  suggestedActions?: { action: string; label: string; labelCN: string }[];
  railRoutes?: RailRoute[];
  recommendations?: any[];
  plans?: any[];
  accommodations?: any[];
  flights?: any[];
  carRentals?: any[];
  weather?: any;
  // ...
}
```
