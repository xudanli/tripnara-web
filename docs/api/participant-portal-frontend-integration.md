# Participant Portal — 前端对接

**版本：** Gate 1 V0.1 / V0.2  
**Base URL：** `/api`  
**封装：** `src/api/participant-portal.ts` · `src/types/participant-portal.ts` · `src/hooks/useParticipantPortal.ts`

---

## 快速引用

```typescript
import { participantPortalApi, buildParticipantInviteUrl } from '@/api/participant-portal';
import {
  useParticipantInvite,
  useParticipantDashboard,
  useSaveParticipantPreferences,
} from '@/hooks/useParticipantPortal';
```

## 鉴权

| 场景 | 方式 |
|------|------|
| 邀请链接流 | URL `inviteToken`，多数接口 `@Public()` |
| 多项目列表 | `Authorization: Bearer <token>` → `GET /participant/me/projects` |

接受邀请时若已登录，后端可能返回 `needsConfirmation` + `reason`（账号/联系方式不一致），需带 `confirmMismatch: true` 重试。

## 成员状态 → 前端路由

| 状态 | 路由 |
|------|------|
| INVITED / OPENED | `/participant/invites/:token` |
| JOINED | `/participant/projects/:token/consent` |
| CONSENTED / IN_PROGRESS | `/participant/projects/:token/preferences` |
| SUBMITTED | `/participant/projects/:token/dashboard` |

**同意门控：** 须同时授予 `BASE_SERVICE` + `HUMAN_ASSISTED` 才可提交偏好。

## API 映射

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/participant/me/projects` | `listMyProjects` |
| GET | `/participant/invites/:token` | `getInvite` |
| POST | `/participant/invites/:token/accept` | `acceptInvite` |
| POST | `/participant/consents` | `submitConsent` |
| GET | `/participant/projects/:token/dashboard` | `getDashboard` |
| GET | `/participant/projects/:token/trust-surface` | `getTrustSurface` |
| GET/PUT | `/participant/projects/:token/preferences` | `getPreferences` / `savePreferences` |
| GET | `/participant/projects/:token/private-constraints` | `listPrivateConstraintMeta` |
| GET | `/participant/projects/:token/proposals/:id` | `getProposal` |
| POST | `.../proposals/:id/feedback` | `submitProposalFeedback` |
| GET/PATCH | `.../readiness` / `.../readiness/tasks/:id` | `getReadiness` / `patchReadinessTask` |
| GET/POST | `.../change-notices` / `.../ack` | `listChangeNotices` / `ackChangeNotice` |
| GET | `.../change-notices/:id` | `getChangeNotice` |
| GET | `.../notifications` | `listNotifications` |
| POST | `.../withdraw` | `withdraw` |
| POST | `.../feedback` | `submitOutcomeFeedback` |

## 前端页面

| 路由 | 页面 |
|------|------|
| `/participant/invites/:token` | 邀请落地 + 接受 |
| `/participant/projects/:token/consent` | 分层知情同意 |
| `/participant/projects/:token/preferences` | 偏好 / 私密约束 |
| `/participant/projects/:token/dashboard` | 成员首页 |
| `/participant/projects/:token/trust-surface` | 脱敏团队决策说明（Sprint 6） |
| `/participant/projects/:token/proposals/:candidateId` | 方案反馈 |
| `/participant/projects/:token/readiness` | 准备任务 |
| `/participant/projects/:token/changes` | 行中变化 |
| `/participant/projects/:token/changes/:noticeId` | 变化通知详情 |
| `/participant/projects/:token/feedback` | 行后反馈 |
| `/participant/projects/:token/notifications` | 应用内通知 |
| `/dashboard/participant/projects` | 登录用户多项目列表 |

旧路径 `/participant/invitations/:token` 自动重定向。

## Project Fit 衔接

申请详情 / `applications/mine` 返回 `participantPortal.portalPath`，录取确认后跳转成员门户。

确认加入后若响应未立即携带 `participantPortal`，前端会轮询申请详情（`pollProjectFitParticipantPortal`，最多 5 次）。

## Sprint 6 · 脱敏信任面（Trust Surface）

成员端只读；**与顾问端共用 `Gate1TrustCard` 类型**，API 侧脱敏。

| 项 | 说明 |
|----|------|
| API | `GET /participant/projects/:token/trust-surface` |
| 类型 | `Gate1TrustSurface` / `Gate1TrustCard` · `src/types/decision-os.ts` |
| Hook | `useParticipantTrustSurface(token)` |
| UI | `TrustCard` / `TrustCardList` · `ParticipantTrustSurfacePanel` |
| 入口 | Dashboard `trustSurface.cardCount`；Tab「方案说明」 |

`dashboard.trustSurface` 摘要（与顾问 overview 同形）：

```json
{
  "schemaVersion": 1,
  "cardCount": 3,
  "detailPath": "/participant/projects/{token}/trust-surface"
}
```

前端过滤：`subjectType !== 'DECISION'`、`dataSources.kind !== 'ADVISOR'`。方案反馈页嵌入 `subjectId === candidateId` 的单卡。

404 时 UI 显示占位，不阻断成员流程。

完整指南：[decision-os-frontend-integration.md](./decision-os-frontend-integration.md)

## 错误文案

成员端页面统一使用 `resolveParticipantPortalErrorGuide`（`lib/participant-portal-errors.ts`）映射邀请过期、同意未完成、方案版本失效等常见错误。

---

完整字段与 Body 示例见产品 API 规格与 Swagger `/api-docs`。
