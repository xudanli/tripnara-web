# TripNARA Advisor Workspace — 前端对接文档

> Gate 1 顾问工作台 · API V0.1  
> 更新：2026-06  
> Swagger 标签：`gate1-advisor` / `gate1` / `gate1-metrics`

---

## 实现索引

| 模块 | 文件 |
|------|------|
| 顾问 API | `src/api/gate1-advisor.ts` |
| 项目生命周期 | `src/api/gate1-projects.ts` |
| Decision OS 类型 | `src/types/decision-os.ts`（信任面 / SLO） |
| 类型 | `src/types/gate1.ts`（Advisor Workspace V0.1 段） |
| Hooks | `src/hooks/useGate1.ts` |
| 路由常量 | `src/lib/advisor-routes.ts` |
| UI | `src/features/gate1/` |
| PRD | `docs/prd/advisor-workspace-prd.md` |

### 前端路由（挂载于 `/dashboard`）

| 文档路由 | 实际路由 |
|----------|----------|
| `/advisor` | `/dashboard/advisor`（`/dashboard/gate1` 兼容） |
| `/advisor/projects` | `/dashboard/advisor/projects` |
| `/advisor/metrics` | `/dashboard/advisor/metrics` |

### 快速引用

```typescript
import { gate1AdvisorApi } from '@/api/gate1-advisor';
import { advisorRoutes } from '@/lib/advisor-routes';
import {
  useGate1AdvisorDashboard,
  useGate1AdvisorProjectList,
  useGate1ProjectOverview,
  useGate1Constraints,
} from '@/hooks/useGate1';
```

---

## 1. 概述

Advisor Workspace 面向专业旅行顾问的 **决策工作台**。前端职责：

- 展示 **脱敏** 约束、冲突、方案、Readiness、Plan B
- 引导顾问完成 **nextAction**
- 记录决策与 Outcome，支撑 Gate 1 指标

成员端 `/participant/*` 见 `docs/api/participant-portal-frontend-integration.md`。

### 1.1 技术约定

| 项 | 说明 |
|----|------|
| Base URL | 与主 API 相同 |
| 认证 | `Authorization: Bearer <JWT>` |
| 响应 | `{ success, data?, error? }` → `unwrapApiData` |
| 权限 | 403 → Toast + 返回列表 |

---

## 2. 信息架构 ↔ 路由

| 页面 | 主要 API |
|------|----------|
| 工作台首页 | `GET /advisor/dashboard` → `gate1AdvisorApi.getDashboard` |
| 项目列表 | `GET /advisor/projects` → `gate1AdvisorApi.listProjects` |
| 创建项目 | `POST /gate1/projects` → `gate1ProjectsApi.create` |
| 项目概览 | `GET /advisor/projects/:id/overview` → `getOverview`（含 `trustSurface.cardCount`） |
| **信任说明** | `GET /advisor/projects/:id/trust-surface` → `getTrustSurface` |
| 成员与约束 | `GET .../constraints` + `GET .../participants/progress` |
| 冲突中心 | `GET .../conflicts` |
| 候选方案 | `GET .../candidates`、`GET .../compare` |
| 决策 | `GET/POST .../decision` |
| Readiness / Plan B / Outcome | 同 §11–13 |
| 实验看板 | `GET /gate1/metrics` |

**回退策略**：`/advisor/dashboard`、`/advisor/projects`、`/overview` 若 404，UI 回退至 `/gate1/projects` 列表 + 客户端状态推断（`src/lib/gate1-workbench.ts`）。

---

## 3. 新增 V0.1 端点（封装对照）

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/advisor/dashboard` | `getDashboard` |
| GET | `/advisor/projects` | `listProjects(query?)` |
| GET | `/advisor/projects/:id/overview` | `getOverview` |
| GET | `/advisor/projects/:id/trust-surface` | `getTrustSurface` |
| GET | `/advisor/projects/:id/constraints` | `getConstraints` |
| GET | `/advisor/projects/:id/candidates/compare` | `compareCandidates` |
| POST | `/advisor/projects/:id/strategies` | `createStrategy` |
| POST | `/advisor/projects/conflicts/findings/:id/actions` | `submitConflictFindingAction` |
| POST | `/advisor/projects/readiness/findings/:id/actions` | `submitReadinessFindingAction` |
| GET | `/advisor/projects/:id/decisions` | `getDecisions` |
| GET | `/advisor/projects/:id/work-logs` | `getWorkLogs` |
| POST | `/advisor/projects/:pid/participants/:id/remind` | `remindParticipant` |
| GET | `/advisor/organizations/:orgId/portfolio` | `getOrgPortfolio` |
| PATCH | `/gate1/projects/:id/status` | `gate1ProjectsApi.patchStatus` |

既有端点（冲突/方案/决策/Readiness/Plan B）见 `docs/api/gate1-frontend-integration.md` §3。

---

## 4. 关键类型

```typescript
// src/types/gate1.ts + src/types/decision-os.ts
Gate1AdvisorDashboard
Gate1ProjectListRow
Gate1NextAction
Gate1ProjectOverview          // trustSurface?: { cardCount, detailPath }
Gate1TrustSurface / Gate1TrustCard
Gate1ConstraintsSummary
Gate1CandidateCompareResult
Gate1RiskLevel  // HIGH | MEDIUM | LOW
```

---

## 5. 权限与错误

| 场景 | HTTP | 前端 |
|------|------|------|
| 未登录 | 401 | 跳转登录 |
| 非项目成员 | 403 | Toast + `advisorRoutes.projects` |
| 催办 24h 限频 | 400 | 「24 小时内已催办」 |
| materialChange 校验 | 400 | `validateGate1DecisionForm` |

---

## 6. 推荐加载顺序

**首页**：`GET /advisor/dashboard`

**概览 Tab**：`GET /advisor/projects/:id/overview`（首屏）→ 其他 Tab 按需

**成员 Tab**：`GET .../constraints` + `GET .../participants/progress`

**方案对比**：用户选中两个候选后 `GET .../candidates/compare?a=&b=`

**信任说明 Tab**：`GET .../trust-surface`（或 overview 摘要入口）→ `Gate1TrustSurfacePanel`

---

## 8. Sprint 1–5 · 信任面（Trust Surface）

### 8.1 概览入口

`GET /advisor/projects/:projectId/overview` 响应可选字段：

```json
{
  "trustSurface": {
    "schemaVersion": 1,
    "cardCount": 5,
    "detailPath": "/advisor/projects/{projectId}/trust-surface"
  }
}
```

前端：`Gate1ProjectOverviewPanel` 展示「信任说明 · N 张卡片」→ `?tab=trust-surface`。

`resolveAdvisorProjectHref(projectId, { path: detailPath })` 会将 `/trust-surface` 映射为 Tab 路由。

### 8.2 详情

| 项 | 说明 |
|----|------|
| API | `GET /advisor/projects/:projectId/trust-surface` |
| Hook | `useGate1TrustSurface(projectId)` |
| UI | `Gate1TrustCardView` · `Gate1TrustSurfacePanel` |
| 路由 | `/dashboard/advisor/projects/:id?tab=trust-surface` 或独立页 `.../trust-surface` |

卡片字段：`confidence`（level + score + rationale）、`alternatives[]`、`dataSources[]`、`machineAesthetic.disclaimer`（必展示）。

### 8.3 Ops SLO（工程向，非顾问端菜单）

| API | 页面 |
|-----|------|
| `GET /ops/runtime/slo` | `/dashboard/ops/gate1/slo` |
| `GET /ops/runtime/slo/contingency/recent` | 同上 |
| `GET /ops/runtime/slo/decision-dna/recent` | 同上 |

封装：`src/api/gate1-runtime-ops.ts` · Hooks：`useDecisionOsSlo*` in `useGate1.ts`

---

## 9. 不在顾问端范围

| 能力 | 前缀 |
|------|------|
| Ops 人工发布 | `/ops/projects/*` |
| 成员门户 | `/participant/*` |
| 隐私原文 | `/ops/.../private-constraints/read` |

完整字段、Body 示例与枚举见 [decision-os-frontend-integration.md](./decision-os-frontend-integration.md) 与 Swagger `gate1-advisor` 标签。
