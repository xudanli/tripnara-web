# 行程详情 Tab 职责矩阵

> **版本**: 1.0  
> **页面**: `/dashboard/trips/:id`  
> **关联实现**: `src/pages/trips/[id].tsx` · `TripDetailTabNav` · `src/lib/trip-detail-terminology.util.ts`

**最后更新**: 2026-07-05

---

## 1. Tab 职责一览

| Tab | 一句话职责 | 能否编辑 | 主数据源 | Plan Studio 关系 |
|-----|-----------|----------|----------|------------------|
| **概览** | 现在怎么样、要决定什么 | 轻（接受/defer/意图） | `GET /trips/:id/travel-status` | 深链兜底 |
| **时间轴** | 每天怎么排、节奏与冲突 | 只读 | timeline-overview BFF | schedule 深链（`dayNumber`） |
| **地图** | 空间是否连贯 | 只读 | journey-map | 全屏 `/journey-map` |
| **预算** | 钱够不够、怎么优化 | 轻（约束/优化） | trips budget API | budget Tab |
| **成员** | 谁参与、偏好与任务 | 轻（邀请） | collab-overview BFF | 协作中心 |
| **住宿** | 每夜睡哪、订没订 | 只读 + 外链 | accommodation BFF | 备选/修复 |
| **活动** | POI 清单与预订 | 轻（收藏/外链） | activity favorites | 添加/替换 |
| **文件** | 凭证归档 + 行程预订资料 | 上传/删 | trip-files overview | 与 Evidence 互通 |
| **决策记录** | 为什么这样决定 | 只读 | `GET /trips/:id/decision-log` | 证据 → 文件 Tab |

**条件 Tab**

| Tab | 触发 | 说明 |
|-----|------|------|
| 执行 | `IN_PROGRESS` / `COMPLETED` | 点击 Tab **重定向**至 `/dashboard/execute?tripId=`（详情页不重复渲染） |
| 复盘 insights | `COMPLETED` | 行程结束后回顾 |

---

## 2. 与规划工作台分工

```
行程详情 = 决策仪表盘 + 各域只读/轻操作
规划工作台 = 编辑/裁决主战场 + AI 助手
```

- Header **主 CTA**（`进入规划工作台`）保留为唯一 primary 黑按钮
- Tab 内 Plan Studio 入口使用 `outline` / `link`，并带上下文（`dayNumber` / `tab=tasks` / `tab=budget`）
- 概览 **待你决定** 可在本页完成；**建议确认** 无 inline 列表时跳转 Plan Studio 任务 Tab

---

## 3. 统一术语（禁止混用）

实现常量：`TRIP_DETAIL_TERMS`（`src/lib/trip-detail-terminology.util.ts`）

| 用户可见词 | 语义 | Gate / 视觉 | 数据源 | 禁止替代为 |
|-----------|------|-------------|--------|-----------|
| **待你决定** | 必须拍板 | NEED_CONFIRM · gate-confirm | `travel-status.openDecisions` | 「待确认」 |
| **建议确认** | 非阻塞提升把握度 | gate-confirm 浅底 | `pendingVerification` / `pendingConfirmationCount` | 「待确认」 |
| **待确认** | 仅成员/预订 | 上下文 Badge | 成员 Tab / 住宿 bookingStatus | 概览指标 |
| **待补充** | 缺凭证 | gate-confirm | files `PENDING` / `itinerary_pending` | 「待确认」 |
| **监控告警** | 外部变化 | gate-reject / nara-lava 标题 | `travel-status.monitoring` | 「风险」泛称 |

---

## 4. Evidence ↔ 文件 Tab

**聚合规则**（`src/lib/trip-detail-evidence-files.util.ts`）：

| 来源 | `TripFileOverviewItem.source` | 说明 |
|------|------------------------------|------|
| 用户上传 | `trip_file` | 可删可下 |
| 行程预订确认 | `itinerary_booking` | 与 `itineraryItemId` 关联 |
| 预订外链 | `itinerary_link` | 打开 url |
| 缺资料 | `itinerary_pending` | 对应「待补充」 |

**跨 Tab 跳转**

| 从 | 到 | 触发 |
|----|-----|------|
| 决策记录 · 证据区 | 文件 Tab | 「查看行程凭证库」 |
| 文件 Tab · 行程凭证 | 时间轴 | 「行程项」→ `?tab=timeline&highlightItem=` 并 scroll 高亮 |
| 时间轴 · 待处理副文案 | 文件 Tab | 「N 份待补充」可点击 |
| 概览 · Metric | 各 Tab | 见 Wave 2 埋点 `target` 字段 |

---

## 5. 布局与导航

- **MainSidebar**：行程详情页显示全局左侧导航（与规划工作台一致）
- **Tab 顶 Gate 摘要**：时间轴（可执行性）· 预算（Abu 预算健康）— `TripDetailTabGateSummary`
- **横向 Tab**：`TripDetailTabNav`，URL `?tab=` 同步

---

## 6. 埋点

`src/utils/trip-detail-analytics.ts`

| 事件 | 属性 |
|------|------|
| `trip_detail_tab_view` | `trip_id`, `tab` |
| `travel_status_metric_click` | `metric_key`, `target` |
| `trip_detail_plan_studio_deeplink` | `from_tab`, `day_number`, `task_id` |
| `trip_detail_gate_summary_action` | `tab`, `action` |
| `trip_detail_evidence_files_link` | `from_tab`, `direction` |

---

## 7. 验收清单

- [ ] 概览「建议确认」数字与 Plan Studio / inline 列表一致
- [ ] 时间轴指标不出现裸「待确认」（应为「建议确认」）
- [ ] 文件 Tab 展示「行程凭证（来自预订）」分区
- [ ] 决策记录含 file 类 evidence 时可跳转文件 Tab
- [ ] 全站 grep：概览/时间轴 stats 不用「待确认」指代 `pendingConfirmationCount`

---

## 8. 相关文档

- [TRIP_DETAIL_TAB_FRONTEND.md](./TRIP_DETAIL_TAB_FRONTEND.md) — BFF 接入
- [api/trip-detail-tabs-api.md](./api/trip-detail-tabs-api.md) — 后端契约
- [api/trip-files-api.md](./api/trip-files-api.md) — 文件 Tab API
- [information-architecture.md](./information-architecture.md) — Dashboard 布局
