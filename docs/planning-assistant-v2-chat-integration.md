# Planning Assistant V2 Chat 接口对接说明

**接口**: `POST /api/agent/planning-assistant/v2/chat`  
**鉴权**: 公开，无需 Token  
**限流**: 生产 30 次/分钟，开发 300 次/分钟

---

## 1. 请求体

```json
{
  "sessionId": "会话ID（必填，多轮对话需保持一致）",
  "message": "用户消息（自然语言）",
  "language": "zh",
  "context": { "tripId": "可选" }
}
```

## 2. 响应体

**通用字段**: `message`、`messageCN`、`reply`、`replyCN`、`phase`、`sessionId`  
**routing**: 路由信息（`target`、`reason`、`params`）  
**suggestedActions**: 快捷操作（如「明天」「后天」）  
**按 routing.target 返回不同业务数据**: `railRoutes`、`recommendations`、`plans` 等

## 3. 铁路查询流程

| 场景 | phase | 响应 |
|------|-------|------|
| 无日期 | `CLARIFYING_RAIL_DATES` | 返回 `suggestedActions` |
| 补充日期 | - | 用户点击或输入「明天」后，用同一 `sessionId` 再次请求 |
| 有日期 | - | 直接返回 `railRoutes` |

## 4. 前端实现

### 会话管理
- 同一会话使用同一 `sessionId`（由 `usePlanningSessionV2` 管理）

### 建议操作
- `suggestedActions`: `{ label, labelCN?, primary? }[]`
- 点击时以 `labelCN || label` 作为 `message` 再次调用
- `MessageBubble` 已支持点击发送

### 展示逻辑
- 根据 `routing.target` 渲染不同 UI（`MCPDataDisplay`）
- 根据 `phase` 和 `clarificationNeeded` 渲染澄清提示
- `railRoutes` → `RailRouteList` 组件
