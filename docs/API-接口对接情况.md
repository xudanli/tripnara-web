# API 接口对接情况报告

> 生成时间: 2025-01-XX  
> 项目: TripNara 前端系统

---

## 📋 目录

1. [API 配置概览](#api-配置概览)
2. [认证机制](#认证机制)
3. [API 模块清单](#api-模块清单)
4. [各模块接口详情](#各模块接口详情)
5. [错误处理机制](#错误处理机制)
6. [开发环境配置](#开发环境配置)

---

## API 配置概览

### Base URL 配置

**优先级顺序：**
1. `window.__CONFIG__.apiBaseUrl` (从 `/config.js` 动态加载)
2. `VITE_API_BASE_URL` 环境变量
3. 默认使用同域 `/api` (推荐，避免 Mixed Content)

**当前配置：**
- 默认 Base URL: `/api`
- 超时时间: `10000ms` (10秒)
- Agent API 超时: `30000ms` (30秒)
- Content-Type: `application/json`
- 支持 Cookies: `withCredentials: true`

### 代理配置

**开发环境 (Vite):**
- 代理路径: `/api`
- 目标地址: `http://${VITE_BACKEND_HOST}:${VITE_BACKEND_PORT}`
- 默认: `http://127.0.0.1:3000`
- 保留 `/api` 前缀转发到后端

---

## 认证机制

### Token 管理

- **存储位置**: `sessionStorage.getItem('accessToken')`
- **刷新机制**: 使用 Cookie 中的 `refresh_token` 自动刷新
- **请求头格式**: `Authorization: Bearer ${accessToken}`

### 公开接口（无需认证）

以下接口不需要认证：
- `/auth/email/send-code` - 发送验证码
- `/auth/email/login` - 邮箱登录
- `/auth/email/register` - 邮箱注册
- `/auth/google` - Google 登录
- `/auth/refresh` - 刷新 Token

### 401 处理流程

1. 检测到 401 错误
2. 检查是否有 `accessToken`
3. 如果没有，直接跳转登录页
4. 如果有，尝试刷新 Token
5. 刷新成功后重试原请求
6. 刷新失败则清除会话并跳转登录

---

## API 模块清单

系统共包含 **29 个 API 模块**，涵盖以下功能领域：

| 模块 | 文件 | 主要功能 |
|------|------|---------|
| **认证** | `auth.ts` | 用户登录、注册、Token 刷新 |
| **用户** | `user.ts` | 用户信息、偏好设置 |
| **行程** | `trips.ts` | 行程 CRUD、状态管理 |
| **行程详情** | `trip-detail.ts` | 行程详细信息 |
| **行程规划器** | `trip-planner.ts` | AI 行程规划对话 |
| **智能体** | `agent.ts` | 智能体路由和执行 |
| **助手** | `assistant.ts` | 规划助手、行程助手 |
| **执行** | `execution.ts` | 行程执行相关 |
| **规划工作台** | `planning-workbench.ts` | 规划工作台功能 |
| **准备度** | `readiness.ts` | 行程准备度检查 |
| **审核** | `approvals.ts` | 审批流程 |
| **决策** | `decision.ts` | 决策相关 |
| **系统** | `system.ts` | 系统状态、功能可用性 |
| **地点** | `places.ts` | POI 地点查询 |
| **地点图片** | `place-images.ts` | 地点图片批量获取 |
| **酒店** | `hotels.ts` | 酒店查询 |
| **交通** | `transport.ts` | 交通方式查询 |
| **路线方向** | `route-directions.ts` | 路线规划 |
| **行程优化** | `itinerary-optimization.ts` | 行程优化建议 |
| **规划策略** | `planning-policy.ts` | 规划策略 |
| **审核** | `review.ts` | 行程审核 |
| **行程审核** | `trip-review.ts` | 行程审核详情 |
| **联系** | `contact.ts` | 联系方式 |
| **国家** | `countries.ts` | 国家列表 |
| **城市** | `cities.ts` | 城市列表 |
| **小径** | `trails.ts` | 小径信息 |
| **RAG** | `rag.ts` | RAG 检索 |
| **客户端** | `client.ts` | Axios 客户端配置 |

---

## 各模块接口详情

### 1. 认证模块 (`auth.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/google/code` | Google Code 模式登录 |
| POST | `/auth/google/id-token` | Google ID Token 模式登录 |
| POST | `/auth/email/send-code` | 发送邮箱验证码 |
| POST | `/auth/email/login` | 邮箱验证码登录 |
| POST | `/auth/email/register` | 邮箱验证码注册 |
| POST | `/auth/refresh` | 刷新 Access Token |
| POST | `/auth/logout` | 登出 |

**导出对象：** `authApi`

---

### 2. 用户模块 (`user.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user/profile` | 获取用户资料 |
| PUT | `/user/profile` | 更新用户资料 |
| GET | `/user/preferences` | 获取用户偏好 |

**导出对象：** `userApi`

---

### 3. 行程模块 (`trips.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/trips` | 创建行程 |
| GET | `/trips` | 获取所有行程 |
| POST | `/trips/from-natural-language` | 自然语言创建行程 |
| GET | `/trips/:id` | 获取行程详情 |
| PUT | `/trips/:id` | 更新行程 |
| DELETE | `/trips/:id` | 删除行程 |
| GET | `/trips/:id/state` | 获取行程状态 |
| GET | `/trips/:id/schedule` | 获取行程日程 |
| PUT | `/trips/:id/schedule` | 更新行程日程 |
| GET | `/trips/:id/actions` | 获取操作历史 |
| POST | `/trips/:id/actions/undo` | 撤销操作 |
| POST | `/trips/:id/actions/redo` | 重做操作 |
| POST | `/trips/:id/share` | 分享行程 |
| GET | `/trips/shared/:shareToken` | 获取分享的行程 |
| POST | `/trips/shared/:shareToken/import` | 导入分享的行程 |
| POST | `/trips/:id/collaborators` | 添加协作者 |
| GET | `/trips/:id/collaborators` | 获取协作者列表 |
| DELETE | `/trips/:id/collaborators/:userId` | 删除协作者 |
| POST | `/trips/:id/collect` | 收藏行程 |
| DELETE | `/trips/:id/collect` | 取消收藏 |
| POST | `/trips/:id/like` | 点赞行程 |
| DELETE | `/trips/:id/like` | 取消点赞 |
| GET | `/trips/featured` | 获取精选行程 |
| GET | `/trips/:id/offline-pack` | 导出离线包 |
| GET | `/trips/:id/offline-status` | 获取离线状态 |
| POST | `/trips/:id/offline-sync` | 同步离线更改 |
| GET | `/trips/:id/recap` | 获取行程总结 |
| GET | `/trips/:id/recap/export` | 导出行程总结 |
| GET | `/trips/:id/trail-video-data` | 获取轨迹视频数据 |
| POST | `/trips/:id/emergency/sos` | 发送 SOS 紧急求助 |
| GET | `/trips/:id/emergency/history` | 获取 SOS 历史 |
| POST | `/trips/:id/adjust` | 调整行程 |
| GET | `/trips/:id/budget/summary` | 获取预算摘要 |
| GET | `/trips/:id/budget/alert` | 检查预算警报 |
| GET | `/trips/:id/budget/optimization` | 获取预算优化建议 |
| GET | `/trips/:id/budget/report` | 获取预算报告 |
| GET | `/trips/:id/persona-alerts` | 获取角色警报 |
| GET | `/trips/:id/decision-log` | 获取决策日志 |
| GET | `/trips/:id/tasks` | 获取任务列表 |
| PATCH | `/trips/:id/tasks/:taskId` | 更新任务 |
| GET | `/trips/:id/pipeline-status` | 获取流水线状态 |
| POST | `/trips/draft` | 生成行程草稿 |
| POST | `/trips` (SaveDraftRequest) | 保存草稿为行程 |
| POST | `/trips/:tripId/items/:itemId/replace` | 替换行程项 |
| POST | `/trips/:tripId/regenerate` | 重新生成行程 |
| GET | `/trips/:id/evidence` | 获取证据列表 |
| GET | `/trips/attention-queue` | 获取关注队列 |
| GET | `/trips/:id/conflicts` | 获取冲突列表 |
| PUT | `/trips/:id/intent` | 更新行程意图 |
| GET | `/trips/:id/intent` | 获取行程意图 |
| GET | `/trips/:id/days/:dayId/metrics` | 获取单日指标 |
| GET | `/trips/:id/metrics` | 获取行程指标 |
| POST | `/trips/:id/apply-optimization` | 应用优化 |
| GET | `/trips/:id/suggestions` | 获取建议列表 |
| GET | `/trips/:id/suggestions/stats` | 获取建议统计 |
| POST | `/trips/:id/suggestions/:suggestionId/apply` | 应用建议 |
| POST | `/trips/:id/suggestions/:suggestionId/dismiss` | 忽略建议 |
| GET | `/trips/:id/insights` | 获取行程洞察 |

**导出对象：** `tripsApi`, `itineraryItemsApi`

---

### 4. 行程详情模块 (`trip-detail.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trips/:id/detail` | 获取行程详情（全景视图） |

**导出对象：** `tripDetailApi`

---

### 5. 行程规划器模块 (`trip-planner.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/trip-planner/start` | 开始规划对话 |
| POST | `/trip-planner/chat` | 规划对话 |
| POST | `/trip-planner/action` | 执行规划操作 |
| POST | `/trip-planner/confirm` | 确认更改 |
| POST | `/trip-planner/apply-suggestion` | 应用建议 |
| POST | `/trip-planner/undo` | 撤销操作 |

**导出对象：** `tripPlannerApi`

---

### 6. 智能体模块 (`agent.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/agent/route_and_run` | 智能体路由并执行（接口 44） |

**功能说明：**
- 根据用户输入自动路由到 System 1 或 System 2
- 超时时间: 30秒
- 支持多种 UI 状态：thinking, browsing, verifying, repairing 等

**导出对象：** `agentApi`

---

### 7. 助手模块 (`assistant.ts`)

**规划助手接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/agent/planning-assistant/sessions` | 创建规划会话 |
| POST | `/agent/planning-assistant/chat` | 规划助手对话 |
| GET | `/agent/planning-assistant/sessions/:sessionId` | 获取会话状态 |
| GET | `/agent/planning-assistant/quick-recommend` | 快速推荐目的地 |
| GET | `/agent/planning-assistant/users/:userId/preferences` | 获取用户偏好摘要 |
| POST | `/agent/planning-assistant/users/:userId/preferences/clear` | 清除用户偏好 |

**行程助手接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/agent/journey-assistant/chat` | 行程助手对话 |
| GET | `/agent/journey-assistant/trips/:tripId/status` | 获取行程状态 |
| GET | `/agent/journey-assistant/trips/:tripId/reminders` | 获取提醒列表 |
| POST | `/agent/journey-assistant/events/handle` | 处理事件 |
| POST | `/agent/journey-assistant/schedule/adjust` | 调整日程 |
| POST | `/agent/journey-assistant/emergency` | 紧急情况处理 |
| POST | `/agent/journey-assistant/nearby` | 附近推荐 |

**导出对象：** `planningAssistantApi`, `journeyAssistantApi`

---

### 8. 执行模块 (`execution.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/execution/trips/:tripId/status` | 获取执行状态 |
| POST | `/execution/trips/:tripId/check-in` | 签到 |
| POST | `/execution/trips/:tripId/check-out` | 签出 |
| GET | `/execution/trips/:tripId/timeline` | 获取时间线 |

**导出对象：** `executionApi`

---

### 9. 规划工作台模块 (`planning-workbench.ts`)

**主要接口：**

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/planning-workbench/execute` | 执行规划工作台流程（支持 generate/compare/commit/adjust） | ✅ 已实现 |
| GET | `/planning-workbench/state/:planId` | 获取规划状态 | ✅ 已实现 |
| POST | `/planning-workbench/plans/:planId/commit` | 提交方案到行程 | ✅ 已实现 |
| GET | `/planning-workbench/trips/:tripId` | 获取工作台数据 | ❌ 未实现 |
| POST | `/planning-workbench/trips/:tripId/actions` | 执行工作台操作 | ❌ 未实现（文档中有记录） |

**功能说明：**
- `execute` 接口支持多种用户操作：
  - `generate`: 生成新方案（✅ 已使用）
  - `compare`: 对比方案（❌ 未使用）
  - `commit`: 提交方案（❌ 未使用）
  - `adjust`: 调整方案（❌ 未使用）
- 返回三人格评估结果（Abu/Dr.Dre/Neptune）和综合决策
- 超时时间: 60秒（execute），30秒（getState）

**新增接口：**
- ✅ `POST /planning-workbench/plans/:planId/commit` - 提交方案到行程（已实现）

**缺失接口：**
- ❌ `POST /planning-workbench/plans/compare` - 对比多个方案
- ❌ `POST /planning-workbench/plans/:planId/adjust` - 调整方案
- ❌ `GET /planning-workbench/trips/:tripId/plans` - 获取方案列表

**详细分析：** 参见 [规划工作台接口需求分析](./规划工作台接口需求分析.md)

**导出对象：** `planningWorkbenchApi`

---

### 10. 准备度模块 (`readiness.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/readiness/trips/:tripId` | 获取行程准备度 |
| POST | `/readiness/trips/:tripId/check` | 检查准备度 |
| GET | `/readiness/trips/:tripId/items` | 获取准备项列表 |

**导出对象：** `readinessApi`

---

### 11. 审批模块 (`approvals.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/approvals/trips/:tripId` | 获取审批列表 |
| POST | `/approvals/trips/:tripId/approve` | 批准 |
| POST | `/approvals/trips/:tripId/reject` | 拒绝 |

**导出对象：** `approvalsApi`

---

### 12. 决策模块 (`decision.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/decision/trips/:tripId/decide` | 做出决策 |
| GET | `/decision/trips/:tripId/history` | 获取决策历史 |

**导出对象：** `decisionApi`

---

### 13. 系统模块 (`system.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/system/status` | 获取系统状态 |
| GET | `/system/features` | 获取功能可用性 |

**功能检查：**
- Vision (OCR) 可用性
- Voice 可用性
- LLM 可用性
- POI 可用性
- What-If 可用性

**导出对象：** `systemApi`

---

### 14. 地点模块 (`places.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/places/search` | 搜索地点 |
| GET | `/places/:id` | 获取地点详情 |
| GET | `/places/nearby` | 获取附近地点 |

**导出对象：** `placesApi`

---

### 15. 地点图片模块 (`place-images.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/places/images/batch` | 批量获取地点图片 |
| GET | `/places/images/cache-stats` | 获取缓存统计 |

**导出对象：** `placeImagesApi`

---

### 16. 酒店模块 (`hotels.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/hotels/search` | 搜索酒店 |
| GET | `/hotels/:id` | 获取酒店详情 |

**导出对象：** `hotelsApi`

---

### 17. 交通模块 (`transport.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/transport/options` | 获取交通选项 |
| GET | `/transport/routes` | 获取路线 |

**导出对象：** `transportApi`

---

### 18. 路线方向模块 (`route-directions.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/route-directions` | 获取路线方向 |
| POST | `/route-directions/batch` | 批量获取路线方向 |

**导出对象：** `routeDirectionsApi`

---

### 19. 行程优化模块 (`itinerary-optimization.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/itinerary-optimization/optimize` | 优化行程 |
| GET | `/itinerary-optimization/suggestions` | 获取优化建议 |

**导出对象：** `itineraryOptimizationApi`

---

### 20. 规划策略模块 (`planning-policy.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/planning-policy/trips/:tripId` | 获取规划策略 |
| PUT | `/planning-policy/trips/:tripId` | 更新规划策略 |

**导出对象：** `planningPolicyApi`

---

### 21. 审核模块 (`review.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/review/trips/:tripId` | 提交审核 |
| GET | `/review/trips/:tripId` | 获取审核结果 |

**导出对象：** `reviewApi`

---

### 22. 行程审核模块 (`trip-review.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trip-review/trips/:tripId` | 获取审核详情 |
| POST | `/trip-review/trips/:tripId/anchor` | 创建锚点 |

**导出对象：** `tripReviewApi`, `anchorApi`

---

### 23. 联系模块 (`contact.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/contact` | 提交联系表单 |
| GET | `/contact/info` | 获取联系信息 |

**导出对象：** `contactApi`

---

### 24. 国家模块 (`countries.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/countries` | 获取国家列表 |
| GET | `/countries/:code` | 获取国家详情 |

**导出对象：** `countriesApi`

---

### 25. 城市模块 (`cities.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/cities` | 获取城市列表 |
| GET | `/cities/:id` | 获取城市详情 |
| GET | `/cities/search` | 搜索城市 |

**导出对象：** `citiesApi`

---

### 26. 小径模块 (`trails.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trails` | 获取小径列表 |
| GET | `/trails/:id` | 获取小径详情 |

**导出对象：** `trailsApi`

---

### 27. RAG 模块 (`rag.ts`)

**主要接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/rag/search` | RAG 检索 |
| POST | `/rag/query` | RAG 查询 |

**导出对象：** `ragApi`

---

## 错误处理机制

### 响应格式

**成功响应：**
```typescript
{
  success: true,
  data: T
}
```

**错误响应：**
```typescript
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

### 错误类型处理

1. **401 未授权**
   - 自动尝试刷新 Token
   - 刷新失败则跳转登录页

2. **网络错误**
   - `ECONNABORTED`: 请求超时
   - `ERR_NETWORK`: 网络连接错误
   - `ECONNREFUSED`: 连接被拒绝

3. **服务器错误**
   - 500: 服务器内部错误
   - 其他状态码: 显示后端返回的错误消息

### 调试日志

所有 API 请求和响应都会记录到控制台：
- 请求 URL、方法、参数
- 响应状态、数据
- Token 状态
- 错误详情

---

## 开发环境配置

### 环境变量

**`.env.development`:**
```bash
VITE_API_BASE_URL=/api
VITE_BACKEND_HOST=127.0.0.1
VITE_BACKEND_PORT=3000
VITE_MAPBOX_TOKEN=your_token
VITE_GOOGLE_CLIENT_ID=your_client_id
```

### Vite 代理配置

```typescript
proxy: {
  '/api': {
    target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
    changeOrigin: true,
    secure: false,
  }
}
```

### 动态配置支持

支持通过 `/config.js` 动态加载配置：
```javascript
window.__CONFIG__ = {
  apiBaseUrl: 'https://api.example.com'
}
```

---

## 统计摘要

### 接口数量统计

- **认证相关**: 7 个接口
- **行程相关**: 60+ 个接口
- **智能体相关**: 15+ 个接口
- **地点相关**: 10+ 个接口
- **其他功能**: 30+ 个接口

**总计**: 120+ 个 API 接口

### 模块分布

- **核心功能模块**: 8 个
- **数据查询模块**: 10 个
- **辅助功能模块**: 11 个

---

## 注意事项

1. **Token 管理**
   - Access Token 存储在 `sessionStorage`
   - Refresh Token 存储在 Cookie（HttpOnly）
   - Token 过期自动刷新

2. **请求超时**
   - 默认超时: 10秒
   - Agent API 超时: 30秒

3. **参数编码**
   - 使用 `URLSearchParams` 自动处理中文和特殊字符编码
   - 避免双重编码问题

4. **CORS 配置**
   - 开发环境使用 Vite 代理
   - 生产环境需要 Nginx 反向代理或后端 CORS 配置

5. **错误处理**
   - 所有 API 调用都应该有错误处理
   - 使用统一的错误响应格式

---

## 相关文档

- [API 使用说明](./src/api/README.md)
- [助手接口文档](./src/助手接口文档.md)
- [Trip Planner API 增强文档](./docs/api/trip-planner-enhancement.md)

---

**文档维护**: 请及时更新此文档以反映最新的 API 变更。
