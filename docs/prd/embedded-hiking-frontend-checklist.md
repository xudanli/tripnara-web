# 混合出行（Trip + HikePlan）— 前端实现清单

> 对齐 PRD《混合出行行程中的徒步片段》· API 见 `docs/api/embedded-hiking-trip-metadata.md`

## 已完成

| 能力 | 入口 / 文件 |
|------|-------------|
| 类型与 profile | `src/types/hiking-embedded.ts`、`src/lib/trip-hiking.ts` |
| Feature flag | `src/lib/embedded-hiking-feature.ts` |
| 片段 CRUD（metadata 整数组） | `useEmbeddedHikingTrip`、`AddHikingSegmentDialog` |
| 行程详情双轨 | `trips/[id].tsx`：空横幅、阶段条、日卡、片段面板 |
| Plan Studio 双轨 | `ScheduleTab` + `plan-studio/index` 阶段条（不触发 primary generate-plan） |
| 侧栏副标题 | `MainSidebar` + `tripEmbeddedSidebarStore` |
| 创建：混合出行 | `generate.tsx`（light）、`new.tsx`（勾选） |
| 创建：整单硬核 | `generate.tsx`（hiking-heavy）、`new.tsx`（冰岛 IS） |
| 我的徒步分组 | `trails/my-hikes.tsx`（按 tripId） |
| P1 摘要 / phase | `tripsApi.getHikingSummary`、`HIKING_PHASE_LABELS` |
| Readiness 归因参数 | `plannedDate`、`hikePlanId` query |
| 出发门禁文案 | `READINESS_REQUIRED` → prep 页 |
| NSR 48h 提示 | `EmbeddedHikingSegmentsPanel` |

## 自测路径（S1）

**API 脚本**（需登录 JWT，浏览器 DevTools → Application → sessionStorage `accessToken`）：

```bash
ACCESS_TOKEN='<jwt>' ./scripts/s1-embedded-hiking-smoke.sh
```

`POST /trips` 不接受 `X-Test-User-Id`（仅部分 GET 可读）；无 token 时脚本会在步骤 1 失败。

**UI 手测**（`npm run dev`，DEV 下 Flag 默认开，见 `.env.development`）：

1. `generate` 或 `new` 创建 **混合出行** Trip → 详情总览见「待登记片段」
2. 添加片段（route 106、日期在行程内）→ Day 卡 + 右侧片段列表
3. Readiness → 返回后（若后端写 snapshot）摘要/列表展示 level
4. Plan Studio 日程 Tab：徒步日上方绿色卡，无 Trail 整单生成按钮
5. 侧栏：该行程第二行「自驾 · …」

| 步骤 | 自动化（2026-05-20） | 备注 |
|------|----------------------|------|
| 1 创建 | ⬜ 需 JWT | 后端 `10.107.233.141:3000` |
| 2 加片段 | ⬜ | 已修 legacy 回退未写 metadata（`[id].tsx` onCreated） |
| 3 Readiness | ⬜ 手测 | |
| 4 Plan Studio | ⬜ 手测 | |
| 5 侧栏 | ⬜ 手测 | |

## P2（已接前端）

| 项 | 说明 |
|----|------|
| `POST …/with-segment` | `AddHikingSegmentDialog` 优先原子创建 |
| `METADATA_TOO_LARGE` | `embedded-hiking-api-errors` |
| generate-plan embedded | `signals.embeddedHiking` + 片段跨度 `durationDays` |
| 删 Trip | 确认框提示级联删除 HikePlan |

## 待后端 / 后续

- `PUT metadata` 合并与 `hiking-summary` 与后端 phase 算法完全一致
- Readiness 完成后回写 `segment.readinessSnapshot`（当前依赖 GET Trip / summary）
- 片段编辑（改日期）不重建 HikePlan
- `light` + `DRIVING` 历史 Trip 批量迁移（`scan-embedded-hiking-candidates`）
