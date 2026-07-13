# 成员 Onboarding · 统一邀请 · 责任分配 — 前端对接

**版本：** P1（后端接口已上线）  
**Base URL：** `/api`  

| 前端封装 | 后端路径 |
|----------|----------|
| `src/api/invite-resolver.ts` | `GET /api/invites/:token/resolve` |
| `src/api/trip-member-invites.ts` | `/api/trips/member-invites/:code/*` |
| `src/api/trip-responsibility.ts` | `/api/trips/:tripId/responsibility-owners` |
| `src/api/member-confirm-inbox.ts` | 两个 confirm-inbox 路径 |
| `src/api/advisor-trip-create.ts` | `POST /api/trips/advisor-create` |
| `src/api/trip-member-onboarding-profiles.ts` | `GET /api/trips/:tripId/member-onboarding-profiles` |

---

## 路由

| 路由 | 说明 |
|------|------|
| `/invite/:token` | 统一邀请入口 |
| `/join-trip/:code` | 重定向 → `/invite/:code` |
| `/member/:token/onboarding/:stepId` | 10 步偏好采集 |
| `/member/:token/home` | 成员主页（阶段感知 + 确认 inbox） |
| `/dashboard/trips/:id/responsibility` | 责任分配详情 |

---

## 1. 统一邀请解析（P1）

```
GET /api/invites/:token/resolve   # 公开
```

探测顺序（后端 + 前端降级一致）：`trip_member` → `team` → `gate1_participant`

```typescript
interface ResolvedInvite {
  kind: 'trip_member' | 'team' | 'gate1_participant';
  token: string;
  targetPath: string;
  // trip_member / team → /invite/:token
  // gate1_participant → /participant/invites/:token
  preview?: {
    title?: string;
    subtitle?: string;
    destination?: string;
    tripId?: string;
    label?: string;
    expired?: boolean;
  };
}
```

未命中时返回 `{ success: false, error: { code: 'NOT_FOUND', ... } }`，前端继续降级探测（`invite-resolver.ts`）。

---

## 2. 行程成员邀请 + Onboarding

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/trips/member-invites/:code` | 公开 |
| POST | `/trips/member-invites/:code/accept` | 登录 |
| GET/PUT | `/trips/member-invites/:code/onboarding` | 登录 |
| POST | `/trips/member-invites/:code/onboarding/submit` | 登录 |

`inviteUrl` 建议：`{FRONTEND_URL}/invite/{code}`

### POST accept

- 绑定 `tripCollaborator`（角色来自 `roleSlot`），同步 `projectMembership`

### POST submit

- 写入 `trip.metadata.memberOnboardingProfiles[userId]`
- 返回 `homePath: /member/{code}/home`

详见 `src/types/member-onboarding.ts`。

### 2.1 顾问读取团队需求画像（P1 · 已上线）

```
GET /api/trips/:tripId/member-onboarding-profiles
```

- 鉴权：OWNER / ADVISOR / EDITOR（`ADVISOR_PATCH_ROLES`）
- 读取 `trip.metadata.memberOnboardingProfiles`，隐私过滤后返回；顶层 camelCase + snake_case 双写
- 契约全文：`docs/api/team-requirement-profile-bff.md`
- 前端：`src/api/trip-member-onboarding-profiles.ts` · `TeamRequirementProfilePanel`

---

## 3. 责任分配 SSOT

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/trips/:tripId/responsibility-owners` | 登录（行程成员） |
| PATCH | `/trips/:tripId/responsibility-owners` | 登录（OWNER / ADVISOR / EDITOR） |

GET 无 SSOT 时自动推导（`inferred: true`）；PATCH 写入 `trip.metadata.responsibilityOwners`。

```typescript
planningOwner      ← advisor
executionOwner     ← leader
paymentApprover    ← payer
finalApprover      ← finalConfirmer
onTripLeader       ← leader
emergencyContact   ← primaryContact
```

---

## 4. 成员确认 Inbox（P1）

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/trips/member-invites/:code/confirm-inbox` | 登录（已 accept 该邀请） |
| GET | `/trips/:tripId/members/me/confirm-inbox` | 登录（行程成员） |

响应：

```typescript
{ items: MemberConfirmInboxItem[] }
```

**后端过滤规则（前端不再重复过滤 scope）：**

- 仅返回 `AFFECTED_MEMBERS` / `PAYER_AND_MEMBERS` / `ALL_MEMBERS` / `PAYER`
- `AI_AUTO`、`ADVISOR_DIRECT` 不返回
- `PAYER` 仅对 `responsibilityOwners.paymentApprover` 可见
- 数据来源：`DecisionProblemCollector`（无 collector 时返回空列表）

```typescript
interface MemberConfirmInboxItem {
  id: string;
  title: string;
  summary?: string;
  confirmScope: ConfirmScope;
  phase: 'planning' | 'execution' | 'completion';
  status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
  actionHref?: string;
}
```

---

## 5.1 规划中生成同行成员邀请（自由行 / 顾问补发）

```
POST /api/trips/:tripId/member-invites
```

请求：

```typescript
{
  count?: number;       // 默认 1
  labelPrefix?: string; // 默认「同行成员」
  roleSlot?: 'MEMBER';  // 自由行固定 MEMBER
}
```

响应：

```typescript
{
  tripId: string;
  memberInviteCodes: Array<{ inviteCode, inviteUrl, label, expiresAt? }>;
  created?: Array<{ inviteCode, inviteUrl, label, expiresAt? }>;
}
```

- 写入/合并 `trip.metadata.memberInviteCodes`
- 前端封装：`tripMemberInvitesApi.createForTrip`
- 后端未就绪时前端 DEV 降级：本地生成 + 尝试 `PUT /trips/:id` 写入 metadata

---

## 5. 顾问创建（P1 扩展）

```
POST /api/trips/advisor-create
```

响应：

```typescript
{
  tripId: string;
  memberInviteCodes: Array<{ inviteCode, inviteUrl, label }>;
  responsibilityOwners?: TripResponsibilityOwners;  // 创建时预写 metadata
}
```

**创建时 metadata SSOT（协作模式）：**

```typescript
tripCollaborationMode: 'advisor_led'  // 与后端 TRIP_COLLABORATION_MODE_ADVISOR_LED 同值
```

- 前端常量：`src/types/trip-collaboration-mode.ts` · `TRIP_COLLABORATION_MODE_ADVISOR_LED`
- 识别：`src/lib/trip-collaboration-mode.util.ts` · `isAdvisorLedTrip()`（优先读该字段；旧行程才走启发式）
- 后续 PATCH `responsibilityOwners` 会保留 `...existingMeta` 中的该字段

变更：

- `inviteUrl` 为 `{FRONTEND_URL}/invite/{code}`（旧 `/join-trip/` 前端会自动改写）
- 创建后自动写入 `trip.metadata.responsibilityOwners`，前端可跳过 PATCH

---

## 6. 角色归一化

`src/lib/trip-member-roles.util.ts` — portal / team / onboarding / invite label / `roleSlot`。

---

## 7. 阶段感知

`useMemberTripPhaseContext` → `onboarding` | `planning` | `execution` | `completion`

---

## 8. 响应归一化

| 工具 | 用途 |
|------|------|
| `normalize-invite-resolver.util.ts` | 统一邀请 resolve |
| `normalize-trip-member-invite.util.ts` | 成员邀请 / onboarding |
| `normalize-member-confirm-inbox.util.ts` | confirm-inbox |
| `normalize-advisor-trip-create.util.ts` | advisor-create 响应 |
| `normalizeTripResponsibilityOwnersResponse` | 责任分配 |

兼容 snake_case 后端字段。
