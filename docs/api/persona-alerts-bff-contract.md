# Persona Alerts BFF 契约 — C 端人话投影

> **版本**: 1.0.0  
> **状态**: M1–M3 后端已落地 · 前端已对接（2026-06-27）  
> **受众**: BFF / Guardian / 准备度 / 前端  
> **关联**:
> - [`guardian-persona-frontend-integration.md`](./guardian-persona-frontend-integration.md) — Guardian 表达层总览
> - [`decision-api-audit-matrix.md`](./decision-api-audit-matrix.md) — 接口保留清单
> - 前端类型：`src/types/trip.ts` · `PersonaAlert`
> - 前端展示：`src/lib/persona-alert-display.ts` · `ScheduleGuardianDigestCard` · `DecisionStrip`

**最后更新**: 2026-06-27

---

## 1. 背景

### 1.1 问题

`GET /trips/:id/persona-alerts` 当前常把 **编排内部状态** 透传到 C 端，例如：

```text
persona closure
stop=ABU_FATAL_REJECT rechecks=0
```

同时 `title` / `name` 重复人格营销文案（「安全守护者 Abu (北极熊 🐼)」），**未描述具体问题**。

前端 `getPersonaAlertUserBody()` 读取顺序为 `explanation` → `message`；当 `explanation` 为空且 `message` 为 debug 串时，**守护者提醒 / Decision Strip / 行程详情** 均不可读。

### 1.2 目标

BFF 在返回 C 端前，将 Guardian / 准备度 / 可执行证明的 Structured 结果 **投影为固定人话字段**；内部 trace **不得**出现在用户可见响应中。

### 1.3 非目标

- ❌ 不在本接口返回完整 `GuardianPersonaPresentation` 替代方案对比（仍走 workbench / route_and_run）
- ❌ 不在 C 端暴露 `stop=`、`rechecks=`、stack、ResearchPatch 等运维字段
- ❌ 不让前端维护上百条 reason code → 中文映射（BFF 必须给 `reasonCodesDisplayZh`）

---

## 2. 接口

### 2.1 基本信息

| 项 | 值 |
|----|-----|
| 方法 | `GET` |
| 路径 | `/api/trips/:tripId/persona-alerts` |
| 认证 | 需登录；校验用户对 `tripId` 的读权限 |
| 前端封装 | `tripsApi.getPersonaAlerts(tripId)` |
| 响应包装 | 现有 `ApiResponseWrapper<PersonaAlert[]>` |

### 2.2 查询参数（可选，M1 可不实现）

| 参数 | 类型 | 说明 |
|------|------|------|
| `audience` | `user` \| `internal` | 默认 `user`；C 端 BFF 固定 `user` |
| `limit` | `number` | 默认 `20`；按 severity + persona 优先级截断 |
| `phase` | `planning` \| `in_trip` | 过滤 `metadata.expressionPhase` |

---

## 3. OpenAPI 片段

```yaml
paths:
  /trips/{tripId}/persona-alerts:
    get:
      summary: 行程三人格提醒（C 端人话投影）
      tags: [Trips, Guardian]
      parameters:
        - name: tripId
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: audience
          in: query
          schema: { type: string, enum: [user, internal], default: user }
      responses:
        '200':
          description: 用户可见提醒列表（无内部 debug 项）
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonaAlertsResponse'

components:
  schemas:
    PersonaAlertsResponse:
      type: object
      required: [success, data]
      properties:
        success: { type: boolean }
        data:
          type: array
          items: { $ref: '#/components/schemas/PersonaAlertUserFacing' }

    PersonaAlertUserFacing:
      type: object
      required:
        - id
        - persona
        - severity
        - title
        - explanation
        - createdAt
        - metadata
      properties:
        id:
          type: string
          description: 稳定 ID；可与 feasibility issue / decision-log 互链
        persona:
          type: string
          enum: [ABU, DR_DRE, NEPTUNE]
          description: C 端仅三人格；USER_ACTION 内部项不得出现在 audience=user
        severity:
          type: string
          enum: [warning, info, success]
          description: success 表示「本条无待办」；audience=user 时不应返回 success
        title:
          type: string
          maxLength: 40
          description: 问题短标题（中文），非人格昵称
          example: 当前方案被安全门控拦截
        explanation:
          type: string
          maxLength: 500
          description: C 端主文案（1–2 句完整中文 + 可操作建议）
          example: 冰岛高地路段在大风预警下不适合按原计划自驾；请打开可执行证明查看调整项。
        message:
          type: string
          description: 可选；仅 debug / 日志；C 端 UI 不得依赖
        name:
          type: string
          deprecated: true
          description: 历史字段；BFF 可省略或填与 persona 一致的内部名，C 端不展示
        createdAt:
          type: string
          format: date-time
        presentation:
          $ref: '#/components/schemas/GuardianPresentationSnapshot'
        metadata:
          $ref: '#/components/schemas/PersonaAlertMetadata'

    GuardianPresentationSnapshot:
      type: object
      description: 可选；与 Guardian P1/P2 对齐的快照，便于前端统一渲染
      properties:
        headline: { type: string }
        narrative: { type: string }
        briefLines:
          type: array
          items: { type: string }
        leadSpeaker: { type: string, enum: [ABU, DR_DRE, NEPTUNE] }
        scenario:
          type: string
          enum: [SAFETY_BLOCK, SAFETY_WARN, PACE_COST, INTENT_REPAIR, MULTI_FACTOR, ALL_CLEAR]
        displayStyle: { type: string, enum: [design_advisory, execution_brief] }
        expressionPhase: { type: string, enum: [planning, in_trip] }
        actions:
          type: object
          additionalProperties: { type: string, enum: [BLOCK, ADJUST, REPAIR, CHOOSE] }

    PersonaAlertMetadata:
      type: object
      required: [audience]
      properties:
        audience:
          type: string
          enum: [user, internal]
          description: BFF 对 C 端必须全部为 user
        scenario:
          type: string
          description: 与 GuardianPersonaPresentation.scenario 同源
        action:
          type: string
          enum: [ALLOW, REJECT, ADJUST, REPLACE]
        decisionSource:
          type: string
          enum: [PHYSICAL, HUMAN, PHILOSOPHY, HEURISTIC]
        reasonCodes:
          type: array
          items: { type: string }
          description: 内部稳定码；勿直接展示
        reasonCodesDisplayZh:
          type: array
          items: { type: string }
          description: 与 reasonCodes 一一或聚合后的中文短因；可展示在副文案
        readinessEvidenceDisplayZh:
          type: string
          description: 与 decision-log metadata 同源
        deepLink:
          $ref: '#/components/schemas/PersonaAlertDeepLink'

    PersonaAlertDeepLink:
      type: object
      required: [type]
      properties:
        type:
          type: string
          enum: [feasibility, schedule_day, decision_log, plan_gate]
        issueId: { type: string }
        dayIndex: { type: integer, minimum: 1 }
        decisionLogId: { type: string }
```

---

## 4. BFF 投影规则

### 4.1 总原则

```
Guardian / 准备度 / 可执行证明 Structured 结果
        ↓ BFF 投影（audience=user）
PersonaAlertUserFacing[]
        ↓
GET /trips/:id/persona-alerts
```

1. **只返回 `metadata.audience === 'user'` 的条目**（或等价：BFF 层过滤掉 internal）。
2. **`explanation` 必填**；为空则 **整条不返回**（宁可少一条，不可出 debug 串）。
3. **`title` 描述问题**，禁止人格营销模板（含 emoji 昵称、「守护者 xxx」重复）。
4. **`message` 可保留** 供排障，C 端 UI **禁止**作为 fallback 主文案（前端已约定优先 `explanation`）。
5. 同一 `persona` + 同一 `scenario` + 同一 `issueId` **去重**，保留 severity 最高的一条。

### 4.2 文案来源优先级

| 优先级 | 数据源 | 映射 |
|--------|--------|------|
| P0 | 最近一次 `GuardianPersonaPresentation` | `headline` → `title`；`narrative` 或 `briefLines[0]` → `explanation` |
| P1 | `decision-log.metadata.readiness_evidence_display_zh` | → `explanation`（可截断至 500 字） |
| P2 | 可执行证明 open issue | `issue.title` → `title`；`issue.userMessage` → `explanation`；`issueId` → `deepLink` |
| P3 | `reasonCodes` + **服务端原因码表** | → `reasonCodesDisplayZh` + 模板句填充 `explanation` |

**禁止**从以下来源拼接 C 端文案：

- `stop=…` / `rechecks=…` / `persona closure`
- orchestration checkpoint / stack trace
- 未映射的英文 enum 裸值

### 4.3 severity 映射

| Guardian / 门控 | PersonaAlert.severity |
|-----------------|------------------------|
| `BLOCK` / hard constraint / `ABU_FATAL_REJECT` | `warning` |
| `ADJUST` / 节奏过载 / 缓冲不足 | `warning` 或 `info`（可执行但需改） |
| `REPAIR` / 有替代方案 | `info` |
| `ALL_CLEAR` / 无待办 | **不返回**（或 internal only） |

### 4.4 persona 映射

| 责任席位 | persona |
|----------|---------|
| Abu / 安全 / 存在性 | `ABU` |
| Dr.Dre / 节奏 / 成本 / 时间轴冲突 | `DR_DRE` |
| Neptune / 结构修复 / 替代路线 | `NEPTUNE` |

时间轴冲突类 issue 默认归 **`DR_DRE`**（与前端 `TripPersonaHealthPanel` 一致）。

### 4.5 原因码表（示例，后端 SSOT）

BFF 维护 **reason code → 中文** 表；前端仅展示 `reasonCodesDisplayZh`，不解析裸码。

| reasonCode | reasonCodesDisplayZh | 模板 explanation（可带 `{day}` `{place}` 占位） |
|------------|----------------------|--------------------------------------------------|
| `ABU_FATAL_REJECT` | 安全门控拒绝 | 当前方案存在不可接受的安全风险，需要调整后再继续规划。 |
| `HIGH_WIND_DRIVING` | 大风不宜自驾 | 第 {day} 天大风条件下不建议自驾，请改用公共交通或缩短户外段。 |
| `CLOSURE_RISK` | 闭园风险 | {place} 在您计划到达时段可能不开放，请改时间或替换地点。 |
| `PACE_OVERLOAD` | 行程节奏过紧 | 当天安排过多，建议减少站点或增加缓冲。 |
| `BUFFER_INSUFFICIENT` | 转场缓冲不足 | 相邻行程之间预留时间不够，可能赶不上下一项。 |
| `INTENT_REPAIR` | 需结构修复 | 原意图难以执行，系统有替代走法建议，请查看可执行证明。 |

新增码：**必须先入表再返回 C 端**；禁止把未映射码放进 `explanation`。

### 4.6 deepLink 约定

| type | 行为 | 前端 |
|------|------|------|
| `feasibility` | 打开可执行证明侧栏，可选定位 `issueId` | `plan-studio:open-feasibility` + issueId |
| `schedule_day` | 时间轴滚到某天 | `dayIndex` |
| `decision_log` | 展开决策证据 | `decisionLogId` |
| `plan_gate` | 打开方案门控抽屉 | — |

守护者提醒卡片默认 CTA：**打开可执行证明**（`type: feasibility`）。

---

## 5. 示例

### 5.1 反例（禁止再返回给 C 端）

```json
{
  "id": "bad-1",
  "persona": "ABU",
  "name": "安全守护者 Abu (北极熊 🐼)",
  "title": "安全守护者 Abu (北极熊 🐼)",
  "message": "persona closure\nstop=ABU_FATAL_REJECT rechecks=0",
  "severity": "warning",
  "createdAt": "2026-06-27T00:00:00Z"
}
```

### 5.2 正例

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-abu-wind-d3",
      "persona": "ABU",
      "severity": "warning",
      "title": "当前方案被安全门控拦截",
      "explanation": "第 3 天大风条件下不建议自驾穿越高地；请打开可执行证明查看调整项，或改用巴士接驳。",
      "createdAt": "2026-06-27T08:12:00Z",
      "presentation": {
        "headline": "当前方案被安全门控拦截",
        "narrative": "第 3 天大风条件下不建议自驾穿越高地…",
        "leadSpeaker": "ABU",
        "scenario": "SAFETY_BLOCK",
        "displayStyle": "design_advisory",
        "expressionPhase": "planning",
        "actions": { "abu": "BLOCK" }
      },
      "metadata": {
        "audience": "user",
        "scenario": "SAFETY_BLOCK",
        "action": "REJECT",
        "decisionSource": "PHYSICAL",
        "reasonCodes": ["ABU_FATAL_REJECT", "HIGH_WIND_DRIVING"],
        "reasonCodesDisplayZh": ["安全门控拒绝", "大风不宜自驾"],
        "deepLink": {
          "type": "feasibility",
          "issueId": "issue-wind-day3"
        }
      }
    },
    {
      "id": "alert-dre-pace-d2",
      "persona": "DR_DRE",
      "severity": "info",
      "title": "第 2 天行程偏紧",
      "explanation": "当天步行与车程合计超过舒适阈值，建议减少 1 个景点或延后出发。",
      "createdAt": "2026-06-27T08:12:01Z",
      "metadata": {
        "audience": "user",
        "scenario": "PACE_COST",
        "action": "ADJUST",
        "reasonCodes": ["PACE_OVERLOAD"],
        "reasonCodesDisplayZh": ["行程节奏过紧"],
        "deepLink": { "type": "feasibility", "issueId": "issue-pace-day2" }
      }
    }
  ]
}
```

### 5.3 空列表

无用户可见问题时返回 `data: []`（**不要**返回 severity=success 的「一切正常」占位 alert）。

---

## 6. 验收标准

| # | 条件 |
|---|------|
| AC-1 | `audience=user` 响应中 **无** `stop=`、`rechecks=`、`persona closure`、stack/trace |
| AC-2 | 每条 alert **`explanation` 非空**，且为完整中文句（非 enum 裸值） |
| AC-3 | **`title` 不含** 人格昵称/emoji 模板；描述具体问题 |
| AC-4 | 每条 alert 含 **`metadata.reasonCodesDisplayZh`**（与 `reasonCodes` 对应） |
| AC-5 | 与 **可执行证明** 同一 `issueId` 可互链（抽样 3 条 issue 对比） |
| AC-6 | 与 **Decision Strip** 顶部 Abu/Dr.Dre/Neptune 摘要 **语义一致**（同源投影） |
| AC-7 | 无待办时 **`data` 为空数组**，不返回 success 类 filler |

---

## 7. 前端消费（联调后）

### 7.1 展示优先级

```typescript
// src/lib/persona-alert-display.ts
title      ← alert.title
body       ← alert.explanation
           ← alert.presentation?.narrative（可选增强）
subtitle   ← alert.metadata.reasonCodesDisplayZh?.join('、')
CTA        ← alert.metadata.deepLink.type === 'feasibility' → 打开可执行证明
```

### 7.2 过滤（BFF 未就绪前的兜底）

前端保留 `isUserVisiblePersonaAlert()`；BFF 上线后逐步 **仅依赖** `metadata.audience === 'user'`。

### 7.3 涉及页面

- 规划工作台 · 时间轴侧栏 `ScheduleGuardianDigestCard`
- 规划工作台 · `DecisionStrip` / `PlanStudioPlanningHeader`
- 行程详情 · `PersonaAlertsSection`
- Dashboard · `PersonaAlertsSection`

---

## 8. 迁移计划

| 阶段 | 后端 | 前端 |
|------|------|------|
| **M0（当前）** | 透传 debug | 过滤 + 隐藏不可读卡片 |
| **M1** | BFF 填 `explanation` + `reasonCodesDisplayZh` + 过滤 internal | ✅ 前端已对接 |
| **M2** | `presentation` 快照（`supportingLines` / `hardConstraintBlocked`）+ 必含 `deepLink` | ✅ `persona-alert.adapter.ts` · 侧栏/Loop issue 卡 |
| **M3** | readiness-repair loop `ui.personaAlerts` / `issueCards[].personaAlert` 单源 | ✅ `resolve-trip-persona-alerts.ts` · Decision Strip + 侧栏 |

---

## 9. 变更记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-06-27 | 1.1.0 | M2/M3 前端：presentation 快照、loop 单源、issue 卡 personaAlert |
| 2026-06-27 | 1.0.1 | M1 后端落地；前端类型/API/展示/deepLink 对接 |
| 2026-06-27 | 1.0.0 | 初版：C 端人话投影契约 + OpenAPI 片段 |
