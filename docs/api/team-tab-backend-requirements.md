# 团队 Tab 后端接口要求

**文档类型**：后端接口需求  
**关联**：`docs/team-tab-product-interaction-design.md`、`docs/team-tab-product-manager-decision.md`  
**基础路径**：
- 需认证：`/api/v2/user/team`（团队 CRUD、成员、协商、邀请管理）
- 公开接口：`/api/v2/team`（邀请信息、加入团队，无需登录）  
**最后更新**：2026-03-02

---

## 一、已使用接口（需确保实现）

### 1.1 团队 CRUD

| 方法 | 路径 | 说明 | 请求体/响应 |
|------|------|------|-------------|
| POST | `/team` | 创建团队 | Body: `CreateTeamRequest` → `Team` |
| GET | `/team/:teamId` | 获取团队 | → `Team` |
| PATCH | `/team/:teamId` | 更新团队 | Body: `Partial<CreateTeamRequest>` → `Team` |
| DELETE | `/team/:teamId` | 删除团队 | 204 |

### 1.2 成员管理

| 方法 | 路径 | 说明 | 请求体/响应 |
|------|------|------|-------------|
| POST | `/team/:teamId/members` | 添加成员 | Body: `TeamMember` → `Team` |
| DELETE | `/team/:teamId/members/:userId` | 移除成员 | 204 |
| PATCH | `/team/:teamId/members/:userId` | 更新成员 | Body: `Partial<TeamMember>` → `Team` |

### 1.3 团队协商与聚合

| 方法 | 路径 | 说明 | 请求体/响应 |
|------|------|------|-------------|
| POST | `/team/:teamId/negotiate` | 团队协商 | Body: `{ plan, world }` → `TeamNegotiationResponse` |
| GET | `/team/:teamId/weights` | 获取团队综合权重 | → `TeamWeightsResponse` |
| GET | `/team/:teamId/constraints` | 获取团队约束（最弱链） | → `TeamConstraintsResponse` |

### 1.4 类型定义（必须满足）

```typescript
// 创建团队
interface CreateTeamRequest {
  name: string;
  type: TeamType;           // FAMILY | FRIENDS | EXPEDITION | TOUR_GROUP | CUSTOM
  decisionWeightMode: DecisionWeightMode;
  members: TeamMember[];
  teamConstraints?: TeamConstraintsConfig;
}

// 团队成员
interface TeamMember {
  userId: string;
  displayName: string;
  role: MemberRole;        // LEADER | MEMBER | OBSERVER
  decisionWeight: number;  // 0-1
  fitnessLevel: FitnessLevelType;
  experienceLevel: ExperienceLevelType;
  personalWeights: ObjectiveFunctionWeights;
  specialConstraints?: MemberConstraints;
}

// 团队协商响应
interface TeamNegotiationResponse {
  decision: NegotiationDecision;  // APPROVE | REJECT | APPROVE_WITH_CONDITIONS | NEEDS_HUMAN
  consensusLevel: number;        // 0-1
  memberEvaluations: Array<{
    userId: string;
    displayName: string;
    utility: number;
    concerns: string[];
  }>;
  conflicts: Array<{
    type: string;
    members: string[];
    description: string;
    suggestedResolution?: string;  // 有则前端展示为「建议你先做」任务行
  }>;
  teamConstraintsSatisfied: boolean;
}
```

---

## 二、邀请能力（已实现）

### 2.1 生成邀请链接

**需求**：创建者可生成邀请链接，他人通过链接加入团队。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v2/user/team/:teamId/invites` | 生成邀请链接 |

**请求体**（建议）：

```json
{
  "expiresInDays": 7,
  "maxUses": 0
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expiresInDays | number | 否 | 有效期（天），默认 7 |
| maxUses | number | 否 | 最大使用次数，0 表示不限 |

**响应体**：

```json
{
  "inviteToken": "abc123...",
  "inviteUrl": "https://example.com/join-team/abc123...",
  "expiresAt": "2026-03-09T12:00:00Z",
  "expiresInDays": 7
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| inviteToken | string | 邀请令牌，用于校验与加入 |
| inviteUrl | string | 完整邀请 URL，前端可直接复制 |
| expiresAt | string | ISO8601 过期时间 |
| expiresInDays | number | 有效天数（回显） |

**业务规则**：

- 仅团队创建者或领队可生成邀请
- 同一团队可存在多个有效邀请（或按产品约束限制为 1 个）
- 过期或达到 maxUses 后 token 失效

---

### 2.2 通过 Token 获取邀请信息（公开）

**需求**：用户打开邀请链接时，前端需校验 token 并展示邀请信息（团队名、行程概览等），再决定是否加入。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/team/invites/:token` | 获取邀请信息（公开，无需认证） |

**响应体**：

```json
{
  "valid": true,
  "teamId": "team_xxx",
  "teamName": "冰岛环岛小队",
  "tripId": "trip_yyy",
  "tripTitle": "冰岛 10 日环岛",
  "inviterDisplayName": "张三",
  "expiresAt": "2026-03-09T12:00:00Z",
  "memberCount": 3
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| valid | boolean | token 是否有效 |
| teamId | string | 团队 ID |
| teamName | string | 团队名称 |
| tripId | string | 关联行程 ID（若有） |
| tripTitle | string | 行程标题（若有） |
| inviterDisplayName | string | 邀请人显示名 |
| expiresAt | string | 过期时间 |
| memberCount | number | 当前成员数 |

**错误**：token 无效或过期时返回 `valid: false`，或 404。

---

### 2.3 通过 Token 加入团队

**需求**：用户确认后，通过 token 将自己加入团队。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v2/team/invites/:token/join` | 通过邀请链接加入团队（公开，需登录） |

**请求体**（建议）：

```json
{
  "displayName": "李四",
  "role": "MEMBER",
  "fitnessLevel": "INTERMEDIATE",
  "experienceLevel": "SOME_EXPERIENCE"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| displayName | string | 是 | 加入者的显示名 |
| role | string | 否 | 默认 MEMBER |
| fitnessLevel | string | 否 | 默认 INTERMEDIATE |
| experienceLevel | string | 否 | 默认 SOME_EXPERIENCE |

**响应体**：返回更新后的 `Team`，或 `{ teamId, member: TeamMember }`。

**错误**：

- 404：token 无效或过期
- 409：已为团队成员
- 400：参数无效

---

### 2.4 列出团队的邀请链接

**需求**：创建者/领队可查看当前有效的邀请链接，用于复制或撤销。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/user/team/:teamId/invites` | 列出有效邀请 |

**响应体**：

```json
{
  "invites": [
    {
      "inviteToken": "abc123...",
      "inviteUrl": "https://...",
      "expiresAt": "2026-03-09T12:00:00Z",
      "usesCount": 2,
      "maxUses": 0
    }
  ]
}
```

---

### 2.5 撤销邀请

| 方法 | 路径 | 说明 |
|------|------|------|
| DELETE | `/api/v2/user/team/:teamId/invites/:token` | 撤销指定邀请链接 |

---

## 三、可选增强

### 3.1 团队协商响应：建议维度映射

为支持「建议↔维度」认知关联（见 `.claude/agents/协商结果-视觉方案.md`），可在 `conflicts` 或新增字段中提供：

```json
{
  "conflicts": [
    {
      "type": "RHYTHM",
      "members": ["张三"],
      "description": "Day3 行程过紧，建议增加缓冲",
      "suggestedResolution": "将 Day3 最后一站推迟 1 小时",
      "dimension": "rhythm",
      "dimensionLabel": "节奏"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| dimension | string | safety \| rhythm \| philosophy（安全/节奏/修复） |
| dimensionLabel | string | 用户可读标签，如「安全」「节奏」「修复」 |

前端可据此在任务行前展示 `[节奏]` 前缀，建立与评分的认知关联。

---

### 3.2 行程与团队的关联

**现状**：行程 `metadata.teamId` 与团队关联，由前端在创建/更新团队后写入。

**建议**：后端在生成邀请时可接收 `tripId`，将邀请与行程绑定，便于加入页展示行程信息。若团队创建时已传入 `tripId`，可优先使用。

---

## 四、错误码与约定

| HTTP | 含义 | 前端处理 |
|------|------|----------|
| 400 | 参数错误 | Toast 展示 message |
| 401 | 未认证 | 引导登录 |
| 403 | 无权限（如非领队生成邀请） | Toast 提示无权限 |
| 404 | 资源不存在 | Toast + 重定向 |
| 409 | 冲突（如已为成员） | Toast 提示 |
| 500 | 服务端错误 | Toast + 重试入口 |

**响应格式**（建议统一）：

```json
{
  "message": "错误描述",
  "code": "TEAM_INVITE_EXPIRED"
}
```

---

## 五、前端对接清单

| 能力 | 接口 | 前端状态 |
|------|------|----------|
| 团队 CRUD + 成员管理 | 1.1、1.2 | ✅ 已对接 |
| 团队协商、权重、约束 | 1.3 | ✅ 已对接 |
| 生成邀请链接 | 2.1 | ✅ 已对接 |
| 获取邀请信息 | 2.2 | ✅ 已对接 |
| 通过邀请加入 | 2.3 | ✅ 已对接 |
| 列出/撤销邀请 | 2.4、2.5 | ✅ 已对接 |
| 加入团队页路由 | `/join-team/:token` | ✅ 已实现 |
| 协商结果 dimension | 3.1 | 可选增强 |

---

*文档版本：v1.0*
