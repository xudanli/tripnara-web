# Project Fit API 前端对接

Base URL：`/api`  
Swagger：`/api-docs` → 标签 `project-fit`  
认证：Bearer Token（规则配置/审核需登录；`fit-questionnaire?phase=preview` 公开）

**约束：禁止展示 0–100 综合分**；只展示四档结论 + 维度 + 待确认项。

---

## 封装与类型

| 模块 | 文件 | 类型 |
|------|------|------|
| Project Fit 核心 | `src/api/project-fit.ts` | `src/types/project-fit.ts` |
| Admin | `src/api/project-fit-admin.ts` | 同上 |
| 可信项目 + Fit 入口 | `src/api/trusted-projects.ts` | 同上 |
| 问卷归一化/校验 | `src/lib/normalize-fit-questionnaire.ts` | — |
| Hooks | `src/hooks/useProjectFit.ts` | — |
| 展示标签 | `src/lib/project-fit-display.ts` | — |
| UI | `src/features/project-fit/` | — |

---

## 完整申请流程（R1）

```
1. GET  /trusted-projects/:listingId/fit-questionnaire?phase=preview|full
2. GET  /trusted-projects/:listingId/fit-assessment-status
3. POST /trusted-projects/:listingId/fit-assessments
4. PATCH /project-fit/assessments/:id/answers
5. POST /project-fit/assessments/:id/evaluate          ← 动态问卷必填校验
6. GET  /project-fit/assessments/:id/report?role=applicant
7. POST /trusted-projects/:listingId/applications/with-fit  → UNDER_REVIEW
8. GET  /project-fit/applications/:id
9. POST /project-fit/applications/:id/clarify          ← NEEDS_CLARIFICATION
10. GET /trusted-projects/:listingId/applications/review-queue  (领队)
11. POST /project-fit/applications/:id/decision
12. POST /project-fit/applications/:id/confirm         → USER_CONFIRMED / JOINED
```

---

## R1 新增 · 用户 / 领队

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/trusted-projects/:listingId/fit-questionnaire` | `getFitQuestionnaire(listingId, phase)` |
| GET | `/trusted-projects/:listingId/fit-config` | `getFitConfig` |
| POST | `/trusted-projects/:listingId/fit-config` | `updateFitConfig` |
| GET | `/trusted-projects/:listingId/fit-assessment-status` | `getFitAssessmentStatus` |
| GET | `/trusted-projects/:listingId/applications/review-queue` | `getApplicationReviewQueue` |
| POST | `/project-fit/applications/:id/clarify` | `clarifyApplication` |

### fit-assessment-status 响应

```typescript
{
  needsReassessment: boolean;
  reasons: { ruleStale?: boolean; timeExpired?: boolean };
  currentRuleVersion: number;
  assessment: { id, status, overallResult, ruleSnapshotVersion, expiresAt } | null;
}
```

### review-queue 条目

```typescript
{
  applicationId: string;
  fitSummary: { overallResult, teamImpactLevel, hardBlockers, pendingConfirmations };
  systemRecommendation: 'APPROVE' | 'CLARIFY' | 'WAITLIST' | 'REJECT';
}
```

---

## R1 行为变更

| 接口 | R1 变更 |
|------|---------|
| `POST .../applications/with-fit` | 提交后 `UNDER_REVIEW`；校验 `ruleSnapshotVersion` |
| `POST .../assessments/:id/evaluate` | 动态问卷必填项校验 |
| `POST .../applications/:id/confirm` | 有 `tripId` → `JOINED`，否则 `USER_CONFIRMED` |
| `POST .../applications/:id/decision` | 同步 `slotsFilled` |
| `POST .../eligibility-rules` | 规则版本 bump → 旧评估 `EXPIRED` |

---

## 申请 / 申诉状态枚举

**申请：** `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `NEEDS_CLARIFICATION` / `APPROVED` / `WAITLISTED` / `REJECTED` / `APPROVAL_REVOKED` → `USER_CONFIRMED` → `JOINED`

**申诉：** `SUBMITTED` → `TRIAGED` → `UNDER_REVIEW` → `UPHELD` / `PARTIALLY_UPHELD` / `REJECTED`

---

## Admin API

| 方法 | 路径 | 封装 |
|------|------|------|
| GET | `/admin/identity/project-fit/appeals/pending` | `projectFitAdminApi.listPendingAppeals` |
| POST | `.../appeals/:id/triage` | `triageAppeal` |
| POST | `.../appeals/:id/start-review` | `startAppealReview` |
| POST | `.../appeals/:id/resolve` | `resolveAppeal` |
| POST | `.../assessments/expire-outdated` | `expireOutdatedAssessments` |

Admin 管理台：`/dashboard/admin/project-fit/appeals`（`ProjectFitAppealsAdminPage`）。

---

## 前端页面

| 页面 | 路径 | 组件 |
|------|------|------|
| 项目详情 + preview 题目 | `/dashboard/trusted-projects/:id` | `TrustedProjectDetailPage` |
| 适合度评估 | `/dashboard/trusted-projects/:listingId/fit` | `ProjectFitAssessmentPage` |
| 申请详情/确认/补充 | `/dashboard/project-fit/applications/:id` | `ProjectFitApplicationPage` |
| 领队审核 | `/dashboard/project-fit/applications/:id/review` | `ProjectFitLeaderReviewPage` |
| 发布者管理 | `/dashboard/trusted-projects/:id/manage` | 规则 + `FitConfigEditorPanel` + `ProjectFitReviewQueuePanel` |
| Admin 申诉 | `/dashboard/admin/project-fit/appeals` | `ProjectFitAppealsAdminPage` |

### 创建页预填

| Query | 说明 |
|-------|------|
| `?tripId=` | 从行程拉取标题/目的地/日期，创建时写入 `tripId` |
| `?routeTemplateCatalogId=` 等 | 与路线模板 bridge 相同参数，预填项目字段 |

Helper：`src/lib/trusted-project-create-bridge.ts`

---

## DEV 降级

404 / 未就绪时回退 `src/lib/project-fit-mock.ts`。

---

## R2 新增能力

| 模块 | 路径 | 封装 |
|------|------|------|
| 我的申请 | `GET /project-fit/applications/mine` | `listMyApplications` |
| 领队申请中心 | `GET /project-fit/applications/managed` | `listManagedApplications` |
| 规则模板 | `GET/POST /project-fit/rule-templates` | `listRuleTemplates` / `createRuleTemplate` |
| 应用模板 | `POST /trusted-projects/:id/apply-rule-template` | `applyRuleTemplateToListing` |
| 定金确认 | `POST .../applications/:id/deposit-paid` | `markDepositPaid` |
| 证件 | `GET/POST .../assessments/:id/documents` | `listAssessmentDocuments` / `uploadAssessmentDocument` |
| 申诉 R2 | `POST .../appeals` · resolve `overturnEffects` | `submitAppeal` · Admin `resolveAppeal` |
| 声誉争议 | `POST /identity/reputation/disputes` | `identityGovernanceApi.submitReputationDispute` |

### 申请中心 Tab

| Tab | status |
|-----|--------|
| 进行中 | `UNDER_REVIEW`, `NEEDS_CLARIFICATION`, `WAITLISTED`, `APPROVED` |
| 已加入 | `JOINED`, `USER_CONFIRMED` |
| 已结束 | `REJECTED`, `WITHDRAWN`, `APPROVAL_REVOKED` |

### commitmentStatus

`NOT_REQUIRED` · `DEPOSIT_REQUIRED` · `DEPOSIT_PAID` · `DEPOSIT_WAIVED`  
商业项目 `confirm` 前须 `DEPOSIT_PAID`（或豁免）。

### 申诉 targetType（R2）

`APPLICATION` · `FIT_ASSESSMENT` · `ELIGIBILITY_DECISION`

### Admin 页面

| 页面 | 路径 |
|------|------|
| 申请中心 | `/dashboard/project-fit/applications` |
| Project Fit 申诉 | `/dashboard/admin/project-fit/appeals` |
| 声誉争议 | `/dashboard/admin/reputation/disputes` |
