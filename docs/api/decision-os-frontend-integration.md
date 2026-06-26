# Decision OS 前端对接指南

> 版本：Sprint 4–7 · 2026-06  
> 类型文件：[docs/frontend/decision-os.types.ts](../frontend/decision-os.types.ts)（镜像 `src/types/decision-os.ts`）

## 实现索引

| 模块 | 路径 |
|------|------|
| 类型 | `src/types/decision-os.ts` |
| 共享 UI | `src/components/decision-os/`（`TrustCard` · `ConfidenceBadge` · `TrustCardList`） |
| 顾问 API | `src/api/gate1-advisor.ts` |
| 成员 API | `src/api/participant-portal.ts` |
| C 端 consent | `src/api/decision-dna.ts` |
| Ops SLO | `src/api/gate1-runtime-ops.ts` |
| 顾问 UI | `src/features/gate1/components/Gate1TrustSurfacePanel.tsx` |
| 成员 UI | `src/features/participant-portal/components/ParticipantTrustSurfacePanel.tsx` |

---

## 接口清单

### 新增

| 端 | 方法 | 路径 | 鉴权 | 前端封装 |
|----|------|------|------|----------|
| Gate1 顾问 | GET | `/advisor/projects/:projectId/trust-surface` | 顾问 JWT | `gate1AdvisorApi.getTrustSurface` |
| Gate1 成员 | GET | `/participant/projects/:token/trust-surface` | 邀请 token（Public） | `participantPortalApi.getTrustSurface` |
| C 端 | GET | `/users/me/decision-dna/consent` | 用户 JWT | `decisionDnaApi.getConsent` |
| C 端 | PUT | `/users/me/decision-dna/consent` | 用户 JWT | `decisionDnaApi.updateConsent` |
| Ops | GET | `/ops/runtime/slo` | Ops | `gate1RuntimeOpsApi.getSlo` |
| Ops | GET | `/ops/runtime/slo/contingency/recent?limit=20` | Ops | `gate1RuntimeOpsApi.getSloContingencyRecent` |
| Ops | GET | `/ops/runtime/slo/decision-dna/recent?limit=20` | Ops | `gate1RuntimeOpsApi.getSloDecisionDnaRecent` |
| Ops | GET | `/ops/runtime/slo/context-recall/baseline` | Ops | `gate1RuntimeOpsApi.getSloContextRecallBaseline` |
| Ops | GET | `/ops/runtime/slo/memory-state/recent?limit=20` | Ops | `gate1RuntimeOpsApi.getSloMemoryStateRecent` |

### 响应增字段

| 方法 | 路径 | 字段 |
|------|------|------|
| GET | `/advisor/projects/:projectId/overview` | `trustSurface: { schemaVersion, cardCount, detailPath }` |
| GET | `/participant/projects/:token/dashboard` | `trustSurface: { schemaVersion, cardCount, detailPath }` |

---

## 组件：`TrustCard`

顾问端与成员端共用；成员端 API 已脱敏（无 `DECISION` 卡、无 `humanMinutes`、无 `ADVISOR` 数据源）。前端 `variant="participant"` 会再次过滤 `DECISION` 与 `ADVISOR`。

```tsx
import { TrustCard, TrustCardList, ConfidenceBadge } from '@/components/decision-os';

<TrustCard card={card} variant="advisor" projectId={projectId} />
<TrustCard card={card} variant="participant" onAlternativeClick={(id) => {}} />
<TrustCardList cards={cards} variant="participant" />
```

| Prop | 说明 |
|------|------|
| `card` | `Gate1TrustCard` |
| `variant` | `'advisor'`（默认）\| `'participant'` |
| `projectId` | 顾问端深链 Tab |
| `onAlternativeClick` | 替代方案点击 |

### `ConfidenceBadge` 配色

| level | 色 | 文案 |
|-------|-----|------|
| HIGH | green | 高置信 |
| MEDIUM | amber | 中置信 |
| LOW | orange | 低置信 |
| UNKNOWN | gray | 待补充 |

---

## 页面集成

### Gate1 顾问 · 项目详情

```
overview (GET .../overview)
  └─ trustSurface.cardCount > 0 → 入口
       └─ ?tab=trust-surface (GET .../trust-surface)
            └─ TrustCardList(variant="advisor")
```

路由：`/dashboard/advisor/projects/:id?tab=trust-surface`

### Gate1 成员 · Dashboard

```
dashboard (GET .../dashboard)
  └─ trustSurface.cardCount → 「方案说明与依据」
       └─ /participant/projects/:token/trust-surface
            └─ TrustCardList(variant="participant")
```

成员 `proposal` 详情页底部嵌入 `subjectId === candidateId` 的单张 `TrustCard`。

### C 端 · 隐私设置

- 页面：`/dashboard/settings?tab=data` → `DecisionDnaConsentPanel`
- 默认 `implicit_learning: false`
- 文案：开启后系统可从方案调整记录中学习偏好，可随时关闭

### Ops · SLO

- 页面：`/dashboard/ops/gate1/slo`
- 面板：SLO 快照 · 混合干预明细 · Decision DNA 合规审计 · 上下文召回 baseline · MemoryState Shadow diff

---

## 无需前端改动的能力

- Validation Gateway / Contingency 路由（服务端）
- MemoryState → DecisionParams 正式 overlay（`DECISION_PARAMS_MEMORY_STATE_V1=1`）；Shadow diff 仅在 Ops SLO 页只读展示

---

## 测试建议

1. 顾问项目有已发布候选 + Plan B → `cardCount >= 2`
2. 成员 trust-surface 不含 `subjectType: DECISION`（前端亦过滤）
3. consent 默认 false → rollback 后无 DNA UI 变化（后端静默跳过）；可选 toast 引导 opt-in

---

## 相关文档

- [advisor-workspace-frontend-integration.md](./advisor-workspace-frontend-integration.md) §8
- [participant-portal-frontend-integration.md](./participant-portal-frontend-integration.md)
- [user-frontend-integration.md](./user-frontend-integration.md)
