# 行程详情 · 文件 Tab API

> **版本**: 1.1.0  
> **Base**: `/api/trips/:tripId/files`（`apiClient` 默认前缀 `/api`）  
> **状态**: 已实现 · 前端已对接 `TripDetailFilesTab` · 待 migration 部署  
> **关联 UI**: `TripDetailFilesTab`  
> **关联契约**: [trip-detail-tabs-api.md](./trip-detail-tabs-api.md) §3.7  
> **关联文档**: [trip-detail-tab-frontend-integration.md](./trip-detail-tab-frontend-integration.md)  
> **实现**: 后端 `src/trips/trip-files/`

**最后更新**: 2026-07-02

---

## 1. 概述

文件 Tab 原先为前端 mock（分类卡片、最近更新、空间配额）。本模块提供 **行程级文件 CRUD + 统计读模型**，替代 mock，支撑详情页「文件」Tab 首屏与交互。

| 能力 | 说明 |
|------|------|
| 列表 / 分页 | 按分类、状态筛选 |
| 统计 BFF | 总数、已上传、待补充、即将过期、空间用量、分类计数 |
| **聚合读模型** | `GET /files/overview` 合并 `trip_files` + 行程项预订资料（方案 A） |
| 上传 | multipart，OSS 优先、本地降级 |
| 待补充占位 | 无附件记录，用于 checklist 式「缺什么补什么」 |
| 下载 | OSS 签名 URL（1h）或本地/CDN 直链 |
| 删除 | 软删 DB + 尽力删存储对象 |

---

## 2. 鉴权与访问控制

| 项 | 行为 |
|----|------|
| 生产环境 | 需登录；`CurrentUser.userId` 必须为行程成员 |
| 成员判定 | `TripCollaborator` 含该 userId，或 `trip.metadata.userId` 为 owner |
| 非生产 | 无 token 时使用 `anonymous-dev-user`（与 silent-votes 等模块一致） |
| Controller | 当前 `@Public()`，成员校验在 Service 层 |

**403** — 非成员访问  
**401** — 生产环境未登录

---

## 3. 数据模型

### 3.1 持久化 `trip_files`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `trip_id` | string | 关联 `Trip.id`，CASCADE 删除 |
| `uploaded_by_user_id` | string | 上传者 / 创建者 |
| `category` | string | 见 §3.2 |
| `status` | string | `UPLOADED` \| `PENDING` \| `EXPIRED` |
| `file_name` | string? | 原始文件名（PENDING 可为空） |
| `mime_type` | string? | |
| `storage_key` | string? | OSS key 或本地绝对路径 |
| `file_url` | string? | 公开/CDN URL（可选） |
| `file_size_bytes` | int | 默认 0 |
| `title` | string? | 展示标题 |
| `description` | string? | |
| `expires_at` | timestamptz? | 过期时间；读时自动标记 EXPIRED |
| `itinerary_item_id` | UUID? | 可选关联行程项 |
| `metadata` | jsonb? | 扩展预留 |

Migration: `prisma/migrations/20260702120000_trip_files`

### 3.2 文件分类 `category`

| `id` | 标题 | 说明 |
|------|------|------|
| `booking` | 预订凭证 | 机票、酒店、活动预订确认 |
| `travel` | 出行资料 | 行程单、交通票、地图 |
| `insurance` | 保险 | 旅行保险单及理赔资料 |
| `receipts` | 收据 | 消费收据与报销凭证 |
| `visa` | 签证 | 签证、护照复印件 |
| `team` | 团队共享 | 团队内共享文件 |

### 3.3 状态 `status`

| 值 | 含义 |
|----|------|
| `UPLOADED` | 已有附件，可下载 |
| `PENDING` | 占位，待用户上传 |
| `EXPIRED` | `expires_at` 已过（列表/stats 读前自动批量更新） |
| `REFERENCE` | overview 专用：行程项内嵌确认资料 |
| `LINK` | overview 专用：预订链接 |

**即将过期**（stats）：`UPLOADED` 且 `expires_at` 在未来 30 天内。

---

## 4. 接口列表

| 优先级 | 方法 | 路径 | 说明 |
|--------|------|------|------|
| **P0** | GET | `/trips/:tripId/files/overview` | 聚合读模型（trip_files + itinerary） |
| **P0** | GET | `/trips/:tripId/files` | 文件列表 |
| **P0** | GET | `/trips/:tripId/files/stats` | 统计与空间 |
| P1 | POST | `/trips/:tripId/files` | multipart 上传 |
| P1 | POST | `/trips/:tripId/files/pending` | 创建待补充占位 |
| P1 | DELETE | `/trips/:tripId/files/:fileId` | 删除 |
| P2 | GET | `/trips/:tripId/files/:fileId/download` | 下载签名 URL |

统一响应包装：

```typescript
{ success: true, data: T }
{ success: false, error: { code: string, message: string } }
```

---

## 5. 接口明细

### 5.0 `GET /trips/:tripId/files/overview`

**方案 A 聚合 BFF**：一次返回 Files Tab 首屏所需的统计 + 合并列表。

| `source` | 含义 | 来源 |
|----------|------|------|
| `trip_file` | 已上传/占位文件 | `trip_files` 表 |
| `itinerary_booking` | 确认号 / note 内嵌资料 | `ItineraryItem.bookingConfirmation`、`note.bookingDocuments` |
| `itinerary_link` | 预订链接 | `ItineraryItem.bookingUrl` 或内嵌 doc URL |
| `itinerary_pending` | 缺资料占位 | 需预订但无附件/确认号/链接的行程项 |

#### Query

| 参数 | 类型 | 说明 |
|------|------|------|
| `category` | string | 同 §3.2 |
| `status` | string | `UPLOADED` / `PENDING` / `EXPIRED` / `REFERENCE` / `LINK` |
| `source` | string | 见上表 |
| `limit` | number | 默认 50，最大 200 |
| `offset` | number | 默认 0 |
| `includePending` | boolean | 默认 `true` |

#### Response `data`

见 `src/types/trip-files.ts` → `TripFileOverviewResponse`。

**前端**：`tripFilesApi.getOverview` / `loadTabData`（overview 不可用时降级 `stats` + `list`）。

---

### 5.1–5.6

其余接口明细同 v1.0.0：`GET /files`、`GET /files/stats`、上传、pending、download、delete。

---

## 6. 前端对接

```typescript
// src/api/trip-detail-tab-client.ts
tripFilesApi.getOverview(tripId, { category?, status?, source?, limit?, offset?, includePending? })
tripFilesApi.loadTabData(tripId) // 优先 getOverview，降级 stats + list
tripFilesApi.getList(tripId, { category?, limit?, offset?, status? })
tripFilesApi.getStats(tripId)
tripFilesApi.upload(tripId, FormData)
tripFilesApi.createPending(tripId, body)
tripFilesApi.getDownloadUrl(tripId, fileId)
tripFilesApi.delete(tripId, fileId)
```

| 文件 | 说明 |
|------|------|
| `src/types/trip-files.ts` | 类型 SSOT（含 overview） |
| `src/api/trip-detail-tab-client.ts` | API 客户端 |
| `src/lib/trip-files.util.ts` | 格式化 / 分组 / source 判断 |
| `src/components/trips/detail/tabs/TripDetailFilesTab.tsx` | Tab UI |

---

## 7. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.1.0 | 2026-07-02 | 新增 `GET /files/overview`；前端 Tab 对接聚合读模型 |
| 1.0.0 | 2026-07-02 | 初版：P0 list/stats + P1 上传/删除/pending |
