# Identity Governance API 前端对接

Base URL：`/api`（`apiClient` 默认 `baseURL`）  
Swagger：`/api-docs`（标签：`identity-governance`、`trusted-projects`）  
认证：除标注「公开」外，均需 `Authorization: Bearer <token>`

统一响应：

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## 封装与类型

| 模块 | 文件 | 类型 |
|------|------|------|
| 账号 / 验证 / 认证 / 发布 / 资质 / 声誉 / 背书 / 信任档案 | `src/api/identity-governance.ts` | `src/types/identity-governance.ts` |
| 可信旅行项目 | `src/api/trusted-projects.ts` | `src/types/trusted-projects.ts` |
| 账号能力（Settings 用） | `src/api/account-governance.ts` → `getCapabilities` | `src/types/account-governance.ts` |
| Professional 申请表单 | `src/api/professional-certification.ts` | `src/types/professional-certification.ts` |
| Agency 申请表单 | `src/api/agency-certification.ts` | `src/types/agency-certification.ts` |

响应解包：`src/lib/api-response.ts` → `unwrapApiData`  
Overview 归一化：`src/lib/normalize-account-governance.ts` → `normalizeAccountOverview`

Hook：`useAccountCapabilities`（`src/hooks/useAccountCapabilities.ts`）内部调用 `accountGovernanceApi.getCapabilities`，已对接 `GET /identity/account/overview`。

DEV 降级：identity 接口 404 / 未就绪时，账号能力回退 mock；Professional / Agency 提交回退 localStorage 草稿。

---

## 1. 账号中心

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/account/overview` | `identityGovernanceApi.getAccountOverview` |
| GET | `/identity/account/permissions` | `identityGovernanceApi.getAccountPermissions` |
| POST | `/identity/account/context/switch` | `identityGovernanceApi.switchAccountContext` |

切换上下文 body：

```typescript
import { identityGovernanceApi } from '@/api/identity-governance';

await identityGovernanceApi.switchAccountContext({
  contextType: 'organization',
  contextId: organizationId,
});
```

---

## 2. 身份验证

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/verification/status` | `getVerificationStatus` |
| GET | `/identity/verification/types` | `getVerificationTypes` |
| POST | `/identity/verification/start` | `startVerification` |

EMAIL 验证走现有 auth 流程；`startVerification` 用于 `PHONE | REAL_NAME | AGE`。

---

## 3. Professional 专业认证

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/professional/status` | `getProfessionalStatus` |
| POST | `/identity/professional/draft` | `saveProfessionalDraft` |
| POST | `/identity/professional/submit` | `submitProfessional` |
| GET | `/identity/project-memberships` | `getProjectMemberships` |

表单提交走 `professionalCertificationApi.submitApplication`（内部：draft → submit）。

关键字段：`isVerifiedProfessional: boolean`

---

## 4. 机构 / Agency

| 方法 | 路径 | 封装 |
|------|------|------|
| POST | `/identity/organizations` | `createOrganization` |
| GET | `/identity/organizations/mine` | `getMyOrganizations` |
| GET | `/identity/organizations/invites/pending` | `getPendingOrganizationInvites` |
| GET | `/identity/organizations/:id/certification/status` | `getAgencyCertificationStatus` |
| POST | `/identity/organizations/:id/certification/draft` | `saveAgencyCertificationDraft` |
| POST | `/identity/organizations/:id/certification/submit` | `submitAgencyCertification` |
| GET/POST | `.../members*` | `getOrganizationMembers` / `invite` / `accept` / `decline` / `remove` |

Agency 表单：`agencyCertificationApi.submitApplication` 会自动 `createOrganization`（若无 orgId）→ draft → submit。

---

## 5. 发布权限

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/publishing/permission` | `getPublishingPermission` |
| GET | `/identity/publishing/applications` | `getPublishingApplications` |
| POST | `/identity/publishing/applications` | `submitPublishingApplication` |

`level`：`PRIVATE_ONLY`（默认）→ `PUBLIC_NON_COMMERCIAL` → `PUBLIC_COMMERCIAL`

前置：邮箱或手机至少一项已验证；`PUBLIC_COMMERCIAL` 个人需 Professional、机构需 Agency 认证。

---

## 6. 可信旅行项目（Trusted Projects）

Match Square 公开招募已冻结，新项目走此路径。

| 方法 | 路径 | 认证 | 封装 |
|------|------|------|------|
| GET | `/trusted-projects` | 公开 | `trustedProjectsApi.list` |
| GET | `/trusted-projects/:id` | 公开 | `trustedProjectsApi.getById` |
| GET | `/trusted-projects/mine/list` | 登录 | `listMine` |
| POST | `/trusted-projects` | 登录 | `create` |
| POST | `/trusted-projects/:id/submit` | 登录 | `submit` |
| POST | `/trusted-projects/:id/applications` | 登录 | `apply` |
| GET | `/trusted-projects/:id/applications` | 登录 | `listApplications` |
| POST | `.../applications/:applicationId/review` | 登录 | `reviewApplication` |
| POST | `/trusted-projects/:id/close` | 登录 | `close` |
| POST | `/trusted-projects/:id/withdraw` | 登录 | `withdraw` |

`listingStatus`：`draft` → `pending_review` → `published` → `closed` / `suspended`

`GET /trusted-projects` 响应 `data` 为分页对象（非裸数组）：

```json
{ "items": [ /* TrustedProjectListing */ ], "total": 0 }
```

前端经 `normalizeTrustedProjectListResponse` 解包为 `TrustedProjectListing[]`。

---

## 7. 资质 Qualification

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/qualifications/mine` | `getMyQualifications` |
| POST | `/identity/qualifications` | `submitQualification` |
| GET | `/identity/qualifications/subjects/:type/:id` | `getSubjectQualifications`（公开） |

---

## 8. 声誉 Reputation（无综合信用分）

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/reputation/:type/:id/summary` | `getReputationSummary` |
| GET | `/identity/reputation/:type/:id/events` | `getReputationEvents` |

**前端只展示 `facts` 各项计数，禁止计算或展示 `compositeScore` / `creditScore`。**

---

## 9. 机构背书 Endorsement

| 方法 | 路径 | 封装 |
|------|------|------|
| POST | `/identity/endorsements` | `submitEndorsement` |
| GET | `/identity/endorsements/subjects/:type/:id` | `getSubjectEndorsements` |
| GET | `/identity/endorsements/issuers/:type/:id` | `getIssuerEndorsements` |

前置：关联项目须已有 `PROJECT_COMPLETED` 声誉事件。

---

## 10. 信任档案 Trust Profile

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/identity/trust-profiles/me` | `getMyTrustProfile` |
| GET | `/identity/trust-profiles/users/:userId` | `getUserTrustProfile`（公开） |
| GET | `/identity/trust-profiles/organizations/:id` | `getOrganizationTrustProfile`（公开） |

公开用户档案含：`verification`、`professional`、`qualifications`、`endorsements`、`reputationFacts`（无信用分）。

---

## 11. 推荐页面流程

```
账号中心 (Settings ?tab=governance)
  ├─ 验证          → identityGovernanceApi.startVerification / getVerificationStatus
  ├─ Professional  → /dashboard/account/professional/apply
  ├─ 发布权限      → PublishingPermissionApplyDialog（Settings 面板内）
  └─ Agency        → /dashboard/account/agency/apply

可信项目市场
  ├─ 公开浏览      → /trusted-projects
  ├─ Dashboard     → /dashboard/trusted-projects
  ├─ 我的项目      → /dashboard/trusted-projects/mine
  ├─ 创建草稿      → /dashboard/trusted-projects/new
  └─ 管理/审核     → /dashboard/trusted-projects/:id/manage

公开信任档案      → /trust/users/:userId 或 /dashboard/trust/users/:userId
  ├─ 验证徽章      → TrustProfilePublicView
  ├─ 专业认证
  ├─ 资质 / 背书
  └─ 声誉事实（计数）

搭子广场          → /dashboard/tripnara/plaza（顶部横幅引导至可信项目）
```

### 前端页面与封装

| 页面 | 路径 | 组件 |
|------|------|------|
| 可信项目市场 | `/dashboard/trusted-projects` | `TrustedProjectsMarketPage` |
| 项目详情 | `/dashboard/trusted-projects/:id` | `TrustedProjectDetailPage` |
| 公开市场 | `/trusted-projects` | 同上 `showDashboardChrome={false}` |
| 我的项目 | `/dashboard/trusted-projects/mine` | `MyTrustedProjectsPage` |
| 创建项目 | `/dashboard/trusted-projects/new` | `TrustedProjectCreatePage` |
| 管理申请 | `/dashboard/trusted-projects/:id/manage` | `TrustedProjectManagePage` |
| Project Fit 评估 | `/dashboard/trusted-projects/:listingId/fit` | `ProjectFitAssessmentPage` |
| 申请详情 | `/dashboard/project-fit/applications/:id` | `ProjectFitApplicationPage` |
| 领队审核 | `/dashboard/project-fit/applications/:id/review` | `ProjectFitLeaderReviewPage` |
| 公开信任档案 | `/trust/users/:userId` | `PublicTrustProfilePage` |
| 发布权限申请 | Settings → 身份与权限 | `PublishingPermissionApplyDialog` |

---

## 12. 管理后台（Admin）

前缀：`/admin/identity/*` — 前端管理台待单独封装，不在 C 端 `identityGovernanceApi` 内。

---

---

## 迁移说明

| 旧路径 | 新路径 |
|--------|--------|
| `GET /account/capabilities` | `GET /identity/account/overview` |
| `POST /professional/applications` | `POST /identity/professional/draft` + `submit` |
| `POST /agency/certification/applications` | `POST /identity/organizations/:id/certification/*` |

旧芝麻信用 / Reputation OS 综合分 UI 已下线；新声誉仅展示事实计数。

Project Fit 申请请使用 `applications/with-fit`，详见 [`project-fit-api.md`](./project-fit-api.md)。
