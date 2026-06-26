# Context API 前端对接

BFF：`POST /api/context/build`  
封装：`src/api/context.ts` → `contextApi.build` / `buildContextWithAutoCompress`  
类型：`BuildContextPackageRequest`（与后端 `BuildContextPackageDto` 对齐）

---

## 何时需要直连

| 场景 | 建议 |
|------|------|
| 规划助手 / Agent 对话 | **不必**直连；走 `POST /agent/route_and_run`（带 `trip_id` + `user_id`），记忆与 Context 由后端装配 |
| 规划工作台 execute 前预构建 Context | 可直连（见 `PlanningWorkbenchTab`） |
| 自然语言创建行程（无 tripId） | 可直连，不传 `includePrivate` |

用户 C 端应优先 `route_and_run`，直连 Context 仅保留在已有工作台增强路径。

---

## 请求体

```json
{
  "tripId": "trip-123",
  "userId": "当前登录用户 id",
  "phase": "planning",
  "agent": "PLANNER",
  "userQuery": "...",
  "includePrivate": true
}
```

| 字段 | 作用 |
|------|------|
| `tripId` | 行程上下文；多人协作记忆依赖此字段 |
| `userId` | 领域影响力 snapshot、愿望单私密块、负责人私密约束；**缓存 key 含 userId**，避免用户间私密块串缓存 |
| `includePrivate: true` | 注入 `WISHLIST_PRIVATE`、`DOMAIN_INFLUENCE_PRIVATE` |
| `phase` / `agent` | 与编排阶段一致，如 `planning` + `PLANNER` |

> 仅传 `includePrivate: true` 而不传 `userId` 时，团队可见块（`WISHLIST_TEAM`、`DOMAIN_INFLUENCE_TEAM`）仍可能部分生效，**私密相关块不完整**。前端在 `contextApi.build` 内会对该组合打 `console.warn`。

---

## 前端示例

```typescript
import { contextApi, type BuildContextPackageRequest } from '@/api/context';

const body: BuildContextPackageRequest = {
  tripId,
  userId: user.id,
  phase: 'planning',
  agent: 'PLANNER',
  userQuery: '帮我规划冰岛 7 天行程',
  includePrivate: true,
  tokenBudget: 3600,
  useCache: true,
};

const { contextPackage } = await contextApi.build(body);
```

Hook 封装：`useContextApi().buildContextWithCompress(body, { strategy: 'balanced' })`。

---

## Context Block 类型（调试 / 管理台）

业务 UI 一般不必解析 blocks；Agent 在服务端消费。若展示 block 列表，可识别：

| `type` | 可见性 |
|--------|--------|
| `DOMAIN_INFLUENCE_TEAM` | 团队 |
| `DOMAIN_INFLUENCE_PRIVATE` | 私密（需 userId + includePrivate） |
| `WISHLIST_TEAM` | 团队 |
| `WISHLIST_PRIVATE` | 私密（需 userId + includePrivate） |

定义见 `src/api/context.ts` → `ContextBlockType`。

---

## 本仓库调用点

| 文件 | 说明 |
|------|------|
| `src/pages/plan-studio/PlanningWorkbenchTab.tsx` | 已传 `userId` + `includePrivate: true` |
| `src/components/trips/NLChatInterface.tsx` | 创建行程，无 `tripId`，不传协作私密字段 |

---

## 相关

- 用户 API 总览：`docs/api/user-frontend-integration.md` §3（直连 Context 为遗留路径，建议收敛）
- 协作 UI：团队 Tab → `DomainInfluenceClaimPanel`、`PrivateWishlistPanel`
