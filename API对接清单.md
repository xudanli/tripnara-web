# 前端已对接后端接口清单

本文档列出前端已实现的所有后端API接口对接情况。

**生成时间**: 2024-12-27  
**最后更新**: 2025-01-01  
**统计**: 共 **105** 个接口

---

## 目录

1. [认证授权 (Auth)](#1-认证授权-auth)
2. [行程管理 (Trips)](#2-行程管理-trips)
3. [行程项 (Itinerary Items)](#3-行程项-itinerary-items)
4. [国家档案 (Countries)](#4-国家档案-countries)
5. [地点 (Places)](#5-地点-places)
6. [路线方向 (Route Directions)](#6-路线方向-route-directions)
7. [规划策略 (Planning Policy)](#7-规划策略-planning-policy)
8. [决策引擎 (Decision)](#8-决策引擎-decision)
9. [行程优化 (Itinerary Optimization)](#9-行程优化-itinerary-optimization)
10. [交通规划 (Transport)](#10-交通规划-transport)
11. [用户 (User)](#11-用户-user)
12. [系统状态 (System)](#12-系统状态-system)
13. [智能体 (Agent)](#13-智能体-agent)
14. [RAG 文档检索 (RAG)](#14-rag-文档检索-rag)
15. [酒店 (Hotels)](#15-酒店-hotels)
16. [路线 (Trails)](#16-路线-trails)

---

## 1. 认证授权 (Auth)

**文件**: `src/api/auth.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/auth/email/send-code` | 发送邮箱验证码 | ✅ |
| POST | `/auth/email/register` | 邮箱注册 | ✅ |
| POST | `/auth/email/login` | 邮箱登录 | ✅ |
| POST | `/auth/google/code` | Google登录（授权码方式） | ✅ |
| POST | `/auth/google/id-token` | Google登录（ID Token方式） | ✅ |
| POST | `/auth/refresh` | 刷新Token | ✅ |
| POST | `/auth/logout` | 登出 | ✅ |

**总计**: 6 个接口

---

## 2. 行程管理 (Trips)

**文件**: `src/api/trips.ts`

### 2.1 基础接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips` | 创建新行程 | ✅ |
| GET | `/trips` | 获取所有行程列表 | ✅ |
| POST | `/trips/from-natural-language` | 自然语言创建行程 | ✅ |
| GET | `/trips/:id` | 获取单个行程详情 | ✅ |
| PUT | `/trips/:id` | 更新行程 | ✅ |
| DELETE | `/trips/:id` | 删除行程 | ✅ |

### 2.2 行程状态

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/state` | 获取行程当前状态 | ✅ |

### 2.3 Schedule

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/schedule` | 获取指定日期的Schedule | ✅ |
| PUT | `/trips/:id/schedule` | 保存指定日期的Schedule | ✅ |

### 2.4 操作历史

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/actions` | 获取操作历史 | ✅ |
| POST | `/trips/:id/actions/undo` | 撤销操作 | ✅ |
| POST | `/trips/:id/actions/redo` | 重做操作 | ✅ |

### 2.5 分享

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/share` | 生成行程分享链接 | ✅ |
| GET | `/trips/shared/:shareToken` | 根据分享令牌获取行程 | ✅ |
| POST | `/trips/shared/:shareToken/import` | 导入分享的行程 | ✅ |

### 2.6 协作者

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/collaborators` | 添加行程协作者 | ✅ |
| GET | `/trips/:id/collaborators` | 获取协作者列表 | ✅ |
| DELETE | `/trips/:id/collaborators/:userId` | 移除协作者 | ✅ |

### 2.7 收藏

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/collect` | 收藏行程 | ✅ |
| DELETE | `/trips/:id/collect` | 取消收藏 | ✅ |
| GET | `/trips/collected` | 获取收藏的行程列表 | ✅ |

### 2.8 点赞

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/like` | 点赞行程 | ✅ |
| DELETE | `/trips/:id/like` | 取消点赞 | ✅ |
| GET | `/trips/featured` | 获取热门推荐行程 | ✅ |

### 2.9 离线功能

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/offline-pack` | 导出行程离线数据包 | ✅ |
| GET | `/trips/:id/offline-status` | 查询离线数据包状态 | ✅ |
| POST | `/trips/:id/offline-sync` | 同步离线修改 | ✅ |

### 2.10 复盘报告

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/recap` | 生成行程复盘报告 | ✅ |
| GET | `/trips/:id/recap/export` | 导出行程复盘报告 | ✅ |
| GET | `/trips/:id/trail-video-data` | 生成3D轨迹视频数据 | ✅ |

### 2.11 紧急求救

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/emergency/sos` | 发送紧急求救信号 | ✅ |
| GET | `/trips/:id/emergency/history` | 获取求救记录 | ✅ |

### 2.12 行程调整

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/trips/:id/adjust` | 修改行程并自动适配调整 | ✅ |

### 2.13 预算管理

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/budget/summary` | 获取行程预算摘要 | ✅ |
| GET | `/trips/:id/budget/alert` | 检查预算预警 | ✅ |
| GET | `/trips/:id/budget/optimization` | 获取预算优化建议 | ✅ |
| GET | `/trips/:id/budget/report` | 生成预算执行分析报告 | ✅ |

**总计**: 37 个接口（全部已对接）

---

## 3. 行程项 (Itinerary Items)

**文件**: `src/api/trips.ts` (itineraryItemsApi)

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/itinerary-items` | 创建行程项 | ✅ |
| GET | `/itinerary-items` | 获取所有行程项 | ✅ |
| GET | `/itinerary-items/:id` | 获取行程项详情 | ✅ |
| PATCH | `/itinerary-items/:id` | 更新行程项 | ✅ |
| DELETE | `/itinerary-items/:id` | 删除行程项 | ✅ |

**总计**: 5 个接口

---

## 4. 国家档案 (Countries)

**文件**: `src/api/countries.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/countries` | 获取所有国家列表 | ✅ |
| GET | `/countries/:countryCode/currency-strategy` | 获取国家的货币策略 | ✅ |
| GET | `/countries/:countryCode/pack` | 获取国家Pack配置 | ✅ |
| GET | `/countries/packs` | 获取所有国家Pack配置列表 | ✅ |
| PUT | `/countries/:countryCode/pack` | 创建或更新国家Pack配置 | ⚠️ 仅提示需配置文件 |
| GET | `/countries/:countryCode/payment-info` | 获取目的地支付实用信息 | ✅ |
| GET | `/countries/:countryCode/terrain-advice` | 获取目的地地形适配建议 | ✅ |

**总计**: 7 个接口（其中1个为提示接口）

---

## 5. 地点 (Places)

**文件**: `src/api/places.ts`

### 5.1 基础CRUD

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/places` | 获取所有地点（分页） | ✅ |
| GET | `/places/:id` | 获取地点详情 | ✅ |
| POST | `/places` | 创建地点 | ✅ |
| PUT | `/places/:id` | 更新地点 | ✅ |
| DELETE | `/places/:id` | 删除地点 | ✅ |

### 5.2 推荐与搜索

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/places/recommendations` | 获取地点推荐列表 | ✅ |
| GET | `/places/:id` | 获取地点详情（带完整信息） | ✅ |
| POST | `/places/batch` | 批量获取地点详情 | ✅ |
| GET | `/places/nearby` | 查找附近的地点 | ✅ |
| GET | `/places/nearby/restaurants` | 查找附近的餐厅 | ✅ |
| GET | `/places/search` | 搜索地点（关键词） | ✅ |
| GET | `/places/search/semantic` | 语义搜索地点 | ✅ |
| GET | `/places/autocomplete` | 地点自动补全 | ✅ |

### 5.3 酒店推荐

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/places/hotels/recommend` | 推荐酒店 | ✅ |
| GET | `/places/hotels/options` | 获取酒店选项（便捷/舒适/经济） | ✅ |

### 5.4 路线难度

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/places/route-difficulty` | 计算路线难度 | ✅ |

**总计**: 15 个接口

---

## 6. 路线方向 (Route Directions)

**文件**: `src/api/route-directions.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/route-directions` | 查询路线方向详情 | ✅ |
| GET | `/route-directions/:id` | 根据ID获取路线方向详情 | ✅ |
| GET | `/route-directions/details` | 获取路线方向详情（通过查询参数，支持id/uuid） | ✅ |
| GET | `/route-directions/cards` | 获取路线方向卡片列表 | ✅ |
| GET | `/route-directions/interactions` | 获取路线方向交互信息 | ✅ |

**总计**: 5 个接口

---

## 7. 规划策略 (Planning Policy)

**文件**: `src/api/planning-policy.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/planning-policy/robustness/evaluate-day` | 仅评估base指标 | ✅ |
| POST | `/planning-policy/what-if/generate-candidates` | 只生成候选方案 | ✅ |
| POST | `/planning-policy/what-if/evaluate-candidates` | 评估候选方案 | ✅ |
| POST | `/planning-policy/what-if/evaluate` | What-If评估（完整接口） | ✅ |
| POST | `/planning-policy/what-if/apply` | 应用候选方案 | ✅ |
| POST | `/planning-policy/what-if/re-evaluate` | 一键复评 | ✅ |

**总计**: 6 个接口

---

## 8. 决策引擎 (Decision)

**文件**: `src/api/decision.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/decision/validate-safety` | 安全规则校验（Abu策略） | ✅ |
| POST | `/decision/adjust-pacing` | 行程节奏智能调整（Dr.Dre策略） | ✅ |
| POST | `/decision/replace-nodes` | 路线节点智能替换（Neptune策略） | ✅ |

**总计**: 3 个接口

---

### 8.1 Dashboard 决策系统

**文件**: `src/api/trips.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trips/:id/persona-alerts` | 获取三人格提醒列表 | ✅ |
| GET | `/trips/:id/decision-log` | 获取决策记录/透明日志 | ✅ |

**总计**: 2 个接口

---

## 9. 行程优化 (Itinerary Optimization)

**文件**: `src/api/itinerary-optimization.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/itinerary-optimization/optimize` | 优化路线（节奏感算法，接口47） | ✅ |
| POST | `/llm/natural-language-to-params` | 自然语言转参数 | ✅ |
| POST | `/llm/humanize-result` | 人性化结果 | ✅ |

**总计**: 3 个接口

---

## 10. 交通规划 (Transport)

**文件**: `src/api/transport.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/transport/plan` | 交通路线规划 | ✅ |

**总计**: 1 个接口

---

## 11. 用户 (User)

**文件**: `src/api/user.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/users/profile` | 获取用户信息 | ✅ |
| PUT | `/users/profile` | 更新用户偏好 | ✅ |

**总计**: 2 个接口

---

## 12. 系统状态 (System)

**文件**: `src/api/system.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/system/status` | 获取系统状态 | ✅ |

**总计**: 1 个接口

---

## 13. 智能体 (Agent)

**文件**: `src/api/agent.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/agent/route_and_run` | 智能体统一入口 - 路由并执行 | ✅ |

**总计**: 1 个接口

---

## 14. RAG 文档检索 (RAG)

**文件**: `src/api/rag.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/rag/retrieve` | RAG 文档检索 - 使用向量检索从知识库中检索相关文档 | ✅ |

**总计**: 1 个接口

---

## 15. 酒店 (Hotels)

**文件**: `src/api/hotels.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/hotels` | 获取所有酒店（分页） | ✅ |
| GET | `/hotels/:id` | 获取酒店详情 | ✅ |
| POST | `/hotels` | 创建酒店 | ✅ |
| PUT | `/hotels/:id` | 更新酒店 | ✅ |
| DELETE | `/hotels/:id` | 删除酒店 | ✅ |

**总计**: 5 个接口

---

## 16. 路线 (Trails)

**文件**: `src/api/trails.ts`

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/trails` | 获取所有路线（分页） | ✅ |
| GET | `/trails/:id` | 获取路线详情 | ✅ |
| POST | `/trails` | 创建路线 | ✅ |
| PUT | `/trails/:id` | 更新路线 | ✅ |
| DELETE | `/trails/:id` | 删除路线 | ✅ |

**总计**: 5 个接口

---

## 统计汇总

| 模块 | 接口数量 | 状态 |
|------|---------|------|
| 认证授权 | 7 | ✅ |
| 行程管理 | 37 | ✅ |
| 行程项 | 5 | ✅ |
| 国家档案 | 7 | ✅ |
| 地点 | 15 | ✅ |
| 路线方向 | 5 | ✅ |
| 规划策略 | 6 | ✅ |
| 决策引擎 | 3 | ✅ |
| 行程优化 | 3 | ✅ |
| 交通规划 | 1 | ✅ |
| 用户 | 2 | ✅ |
| 系统状态 | 1 | ✅ |
| 智能体 | 1 | ✅ |
| RAG 文档检索 | 1 | ✅ |
| 酒店 | 5 | ✅ |
| 路线 | 5 | ✅ |
| **总计** | **104** | **✅ 全部已对接** |

---

## 注意事项

1. ~~**DELETE /trips/:id**~~ - 删除行程接口，前端已完全对接，包含确认对话框、错误处理等功能。✅ 已确认后端已实现。

2. **PUT /countries/:countryCode/pack** - 创建或更新国家Pack配置，当前后端实现会返回提示，需要手动修改配置文件。前端已对接，但实际功能受限。

3. **响应格式**: 大部分接口使用统一响应格式 `{ success: true, data: T }`，部分旧接口可能使用不同的响应格式。

4. **认证**: 除公开接口（如登录、注册、分享链接查看）外，其他接口都需要JWT Bearer Token认证。

5. **错误处理**: 所有接口都通过 `handleResponse` 函数统一处理错误响应。

---

## 更新日志

- 2024-12-27: 初始清单创建，包含所有已对接的接口
- 2024-12-27: 确认删除行程接口已完全对接，更新清单状态为全部已对接
- 2025-01-01: 添加 GET /route-directions/details 接口（接口20）
- 2025-01-01: 添加 POST /agent/route_and_run 智能体统一入口接口（接口44）
- 2025-01-01: 添加 GET /rag/retrieve RAG 文档检索接口（接口46）
- 2025-01-01: 更新统计信息，接口总数从101增加到104

