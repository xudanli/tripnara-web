# 酒店推荐日期澄清 - 体验设计与产品评估

**文档版本**: 1.0  
**创建日期**: 2026-02-19  
**角色**: 体验设计师、产品经理、架构师

---

## 一、体验设计师评估

### 1.1 用户旅程分析

| 阶段 | 用户行为 | 当前体验 | 目标体验 |
|------|----------|----------|----------|
| 意图表达 | 用户说「推荐酒店」 | 直接搜索，无日期时 API 可能返回不准确结果 | 主动澄清，获取准确日期 |
| 信息补充 | 系统追问日期 | 无此环节 | 用户回复「3月15到20号」 |
| 执行搜索 | 带日期搜索 | 可能无日期 | 带完整参数搜索，结果可预订 |

### 1.2 设计原则

- **渐进式披露**：仅在需要时追问，不增加多余步骤
- **上下文感知**：若行程已有日期，自动带出，减少用户输入
- **自然语言友好**：支持「3月15日」「15-20号」「下周」等表达
- **可跳过**：若用户坚持不提供日期，可降级为「浏览模式」（仅展示推荐，不查可订性）

### 1.3 澄清话术设计

| 场景 | 中文话术 | 英文话术 |
|------|----------|----------|
| 无日期 | 好的，请问您计划哪天入住、哪天退房？有了日期可以帮您查价格和可订性。 | When do you plan to check in and check out? I can check availability and prices with dates. |
| 有行程日期可建议 | 您的行程是 3月15日-20日，是否用这几天查酒店？ | Your trip is Mar 15-20. Shall I search hotels for these dates? |
| 日期解析失败 | 没太理解您的日期，能再说一下入住和退房日期吗？（例如：3月15日、3月20日） | I didn't catch the dates. Could you tell me check-in and check-out? (e.g., Mar 15, Mar 20) |

---

## 二、产品经理评估

### 2.1 需求优先级

| 需求 | 优先级 | 说明 |
|------|--------|------|
| 酒店/住宿搜索前澄清日期 | P0 | 提升推荐可预订性，减少无效点击 |
| 从行程自动带出日期 | P1 | 规划工作台场景下，tripId 对应行程已有日期 |
| 自然语言日期解析 | P1 | 支持「3月15日」「下周」等 |
| 日期缺失时降级为浏览模式 | P2 | 可选，部分用户只想先看看 |

### 2.2 触发条件

**始终澄清**：当路由目标为 `hotel` / `accommodation` / `airbnb` 时，不直接执行搜索，改为澄清日期。

**有建议日期**：若有 tripId 且行程有 `startDate` / `endDate`，澄清响应附带 `suggestedDates`，用户可回复「好的」「可以」确认，或直接说其他日期。

**无建议日期**：若无法从行程获取日期，澄清话术为「请问您计划哪天入住、哪天退房？」。

### 2.3 成功指标

- 酒店搜索请求中带日期的比例提升
- 用户从推荐到预订的转化率提升
- 澄清轮次平均 ≤ 1 轮（多数一次追问即可）

---

## 三、架构设计

### 3.1 流程概览

```
用户: "推荐酒店"
    ↓
路由: target=hotel, extractedParams={ location, destination, ... }（无 checkIn/checkOut）
    ↓
检查: 有 tripId? → 查 Prisma.trip → 有 startDate/endDate? → 用行程日期
    ↓ 无
返回澄清响应: phase=CLARIFYING_HOTEL_DATES, 存储 pendingHotelSearch
    ↓
用户: "3月15日到20日"
    ↓
检测 phase=CLARIFYING_HOTEL_DATES → 解析日期 → 合并到 extractedParams → 执行 hotel.search
```

### 3.2 会话状态扩展

```typescript
// 新增 phase
phase: 'CLARIFYING_HOTEL_DATES'

// 新增 preferences 字段（或 sessionState 扩展）
pendingHotelSearch?: {
  target: 'hotel' | 'accommodation' | 'airbnb';
  extractedParams: Record<string, any>;
  routingResult: RoutingResult; // 简化存储，仅需必要字段
}
```

### 3.3 实现要点

1. **拦截点**：在 `PlanningAssistantV2Service.chat()` 中，工具执行前或路由到 hotel/accommodation 业务逻辑前
2. **日期来源优先级**：extractedParams > trip.startDate/endDate > 澄清
3. **日期解析**：优先用 `smartRouter.extractParams` 或 LLM 从用户消息解析，支持 YYYY-MM-DD、自然语言
4. **前端配合**：响应中 `phase=CLARIFYING_HOTEL_DATES` 时，可展示日期选择器或引导用户输入日期

---

## 四、接口变更

### 4.1 响应新增字段（可选）

```typescript
// ChatResponseDto 扩展
clarificationNeeded?: {
  type: 'HOTEL_DATES';
  message: string;      // 澄清话术
  messageCN: string;
};
```

### 4.2 SessionState 扩展

```typescript
// SessionStateResponseDto
phase: '...' | 'CLARIFYING_HOTEL_DATES';
pendingHotelSearch?: { ... };  // 可选，用于前端展示待补充信息
```

---

## 五、实施清单

- [x] 体验/产品评估文档
- [x] 实现日期澄清拦截逻辑
- [x] 实现从 trip 获取日期
- [x] 实现 CLARIFYING_HOTEL_DATES 阶段处理
- [x] 实现自然语言日期解析（extractDatesFromMessage）
- [x] 接口文档更新（API_DOCUMENTATION_COMPLETE.md、FRONTEND_INTEGRATION_GUIDE.md）
- [x] 前端适配：clarificationNeeded 时展示澄清提示卡片（MessageBubble）
- [ ] 前端增强（可选）：phase=CLARIFYING_HOTEL_DATES 时展示日期选择器
- [ ] 单元测试
