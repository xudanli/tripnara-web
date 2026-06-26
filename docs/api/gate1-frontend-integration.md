# Gate 1 Human-Assisted Concierge — 前端对接

> **Advisor Workspace V0.1** 扩展见 [`advisor-workspace-frontend-integration.md`](./advisor-workspace-frontend-integration.md)（dashboard / overview / constraints / 列表筛选等）。

**版本：** V0.3（含 Outcome / Readiness / Plan B）  
**Base URL：** `/api`  
**Swagger 标签：** `gate1` · `gate1-participant` · `gate1-advisor` · `gate1-ops` · `gate1-metrics`

---

## 封装与类型

| 模块 | 文件 | 类型 |
|------|------|------|
| 统一导出 | `src/api/gate1.ts` | `src/types/gate1.ts` |
| 成员门户 | `src/api/gate1-participant.ts` | 同上 |
| 顾问项目 / Baseline / Outcome | `src/api/gate1-projects.ts` | 同上 |
| 顾问只读 / 决策 | `src/api/gate1-advisor.ts` | 同上 |
| 运营控制台 | `src/api/gate1-ops.ts` | 同上 |
| 实验看板 | `src/api/gate1-metrics.ts` | 同上 |
| 共享请求 / 错误 | `src/api/gate1-common.ts` | — |
| 业务错误 UI 映射 | `src/lib/gate1-errors.ts` | — |
| 展示标签 / 决策校验 | `src/lib/gate1-display.ts` | — |
| React Query Hooks | `src/hooks/useGate1.ts` | — |
| UI 页面 | `src/features/gate1/` | — |
| 埋点 | `src/utils/gate1-analytics.ts` | — |

### 快速引用

```typescript
import { gate1Api } from '@/api/gate1';
import { gate1ParticipantApi } from '@/api/gate1-participant';
import { resolveGate1UiErrorGuide, formatGate1MetricRate } from '@/lib/gate1-errors';
import { gate1SourceTypeLabel, validateGate1DecisionForm } from '@/lib/gate1-display';
```

---

## 1. 通用约定

### 1.1 响应格式

成功：`{ "success": true, "data": { ... } }` — 使用 `unwrapApiData`（`gate1-common.ts`）。

失败（HTTP 4xx，NestJS）：`{ statusCode, message: string[], path, timestamp }` — 经 `resolveHttpErrorUserMessage` 归一化后抛出 `Gate1ApiError`。

### 1.2 鉴权

| 类型 | 说明 |
|------|------|
| JWT | 顾问 / 运营 / 看板 — `Authorization: Bearer <token>`（`apiClient` 自动附带） |
| Public | 成员门户 — 仅 `inviteToken`，无需登录 |

### 1.3 三端路由前缀

| 产品面 | 前缀 | 封装 |
|--------|------|------|
| 顾问工作台 | `/gate1/projects`、`/advisor/projects` | `gate1ProjectsApi` · `gate1AdvisorApi` |
| 成员门户 | `/participant/*` | `gate1ParticipantApi` |
| 运营控制台 | `/ops/projects` | `gate1OpsApi` |
| 实验看板 | `/gate1/metrics` | `gate1MetricsApi` |

### 1.4 人工协助标识

已发布输出均含 `sourceType`、`humanAssistedLabel`（类型 `Gate1HumanAssistedMeta`）。UI **必须展示**，使用 `gate1SourceTypeLabel()`。

---

## 2. 成员门户 Participant

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/participant/invitations/:token` | `gate1ParticipantApi.getInvitation` |
| POST | `/participant/consents` | `gate1ParticipantApi.submitConsent` |
| PUT | `/participant/projects/:token/preferences` | `gate1ParticipantApi.savePreferences` |
| POST | `/participant/projects/:token/withdraw` | `gate1ParticipantApi.withdraw` |
| POST | `/participant/projects/:token/feedback` | `gate1ParticipantApi.submitFeedback` |

**H5 路由建议：** `/participant/invitations/:token`  
**完整链接：** `buildGate1ParticipantInviteUrl(inviteUrl)`（`gate1ProjectsApi.createInvitation` 返回 `fullInviteUrl`）

---

## 3. 顾问工作台 Advisor

| 方法 | 路径 | 封装 |
|------|------|------|
| POST | `/gate1/projects` | `gate1ProjectsApi.create` |
| GET | `/gate1/projects` | `gate1ProjectsApi.list` |
| GET | `/gate1/projects/:id` | `gate1ProjectsApi.getById` |
| POST/GET | `/gate1/projects/:id/baseline` | `submitBaseline` / `getBaseline` |
| POST | `/gate1/projects/:id/invitations` | `createInvitation` |
| GET | `/gate1/projects/:id/participants/progress` | `getParticipantsProgress` |
| GET | `/advisor/projects/:id/conflicts` | `gate1AdvisorApi.getConflicts` |
| GET | `/advisor/projects/:id/candidates` | `getCandidates` |
| GET | `/advisor/projects/:id/sanitized-constraints` | `getSanitizedConstraints` |
| GET | `/advisor/projects/:id/readiness` | `getReadiness` |
| GET | `/advisor/projects/:id/plan-b` | `getPlanB` |
| GET | `/advisor/projects/:id/decision` | `getDecision` |
| POST | `/advisor/projects/conflicts/findings/:id/feedback` | `submitConflictFindingFeedback` |
| POST | `/advisor/projects/readiness/findings/:id/feedback` | `submitReadinessFindingFeedback` |
| POST | `/advisor/projects/:id/decision` | `submitDecision` |
| POST | `/advisor/projects/plan-b/:id/pre-decision` | `submitPlanBPreDecision` |
| POST | `/advisor/projects/:pid/plan-b/:id/outcome` | `submitPlanBOutcome` |
| POST | `/gate1/projects/:id/travel-events` | `gate1ProjectsApi.createTravelEvent` |
| GET/POST | `/gate1/projects/:id/outcome` | `getOutcome` / `submitOutcome` |

**决策表单校验：** 前端配合 `validateGate1DecisionForm()` — `materialChange: true` 时必须 `changeTypes` + `changeEvidence`。

---

## 4. 运营控制台 Ops

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/ops/projects/queue` | `gate1OpsApi.getQueue` |
| POST | `/ops/projects/:id/privacy-analysts` | `assignPrivacyAnalyst` |
| POST | `/ops/projects/:id/private-constraints/read` | `readPrivateConstraints` |
| POST | `/ops/projects/:id/sanitized-constraints` | `createSanitizedConstraint` |
| PATCH | `.../sanitized-constraints/:id/review` | `reviewSanitizedConstraint` |
| POST | `/ops/projects/:id/conflicts` | `createConflictReport` |
| POST | `.../conflicts/:version/publish` | `publishConflictReport` |
| POST | `/ops/projects/:id/candidates` | `createCandidate` |
| POST | `.../candidates/:id/publish` | `publishCandidate` |
| POST | `/ops/projects/:id/readiness` | `createReadinessReport` |
| POST | `.../readiness/:version/publish` | `publishReadinessReport` |
| POST | `/ops/projects/:id/plan-b` | `createPlanB` |
| POST | `.../plan-b/:id/publish` | `publishPlanB` |
| POST | `/gate1/projects/:id/work-logs` | `gate1ProjectsApi.createWorkLog` |

**发布门禁：** Baseline 已确认 · 脱敏已审核 · `humanMinutes` 已填 · Readiness RED 已关闭。

---

## 5. 实验看板 Metrics

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/gate1/metrics?cohort=` | `gate1MetricsApi.getMetrics` |
| GET | `/gate1/metrics/export?cohort=` | `gate1MetricsApi.exportMetrics` |

**比率 null：** 该 Cohort 不适用 — UI 用 `formatGate1MetricRate()` 显示 `N/A`，勿与 0 混淆。

---

## 6. 业务错误 → UI

| HTTP | 场景 | `resolveGate1UiErrorGuide().kind` |
|------|------|-----------------------------------|
| 400 | Baseline 未确认 | `baseline_required` |
| 400 | 脱敏未审核 | `sanitization_required` |
| 400 | 未填人工工时 | `human_minutes_required` |
| 400 | Readiness RED 未关闭 | `readiness_red_open` |
| 400 | materialChange 校验 | `decision_validation` |
| 401 | 无 JWT | `unauthorized` |
| 403 | 邀请失效 | `invite_invalid` |
| 404 | 不存在 | `not_found` |

---

## 7. 推荐页面 → 接口（已实现路由）

| 页面 | 路由 | 主要接口 |
|------|------|----------|
| 顾问项目列表 | `/dashboard/gate1/projects` | `gate1ProjectsApi.list` |
| 创建项目 | `/dashboard/gate1/projects/new` | `gate1ProjectsApi.create` |
| 顾问项目详情 | `/dashboard/gate1/projects/:projectId` | Tabs：Baseline / 成员 / 冲突方案 / Readiness / Plan B / 决策 / Outcome |
| Outcome 复盘 | `/dashboard/gate1/projects/:projectId/outcome` | `getOutcome` / `submitOutcome` / `createTravelEvent` |
| 实验看板 | `/dashboard/gate1/metrics` | `gate1MetricsApi.getMetrics` |
| 运营队列 | `/dashboard/ops/gate1` | `gate1OpsApi.getQueue` |
| 运营工作台 | `/dashboard/ops/gate1/projects/:projectId` | ops 上传/发布 |
| 成员邀请落地 | `/participant/invitations/:token` | `gate1ParticipantApi.*` |

完整字段与 Body 示例见产品 PRD 与后端 Swagger `/api-docs`。
