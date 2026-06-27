# Planning Workbench Execute API

> 契约版本：2026-06-27 · OpenAPI 机器可读：`planning-workbench-execute-openapi.yaml`

## 1. 概述

规划工作台主入口，支持 **生成 / 对比 / 提交 / 调整** 行程骨架。响应经 enrich 层处理后，决策文案拆成三层，全部为中文 humanize 文案：

| 层级 | 字段 | 用途 |
|------|------|------|
| 风险事实 | `uiOutput.consolidatedDecision.summary` | 只读展示，不含操作指令 |
| 用户签收 | `uiOutput.confirmations[]` | 勾选确认；**NEED_CONFIRM 时必填 ≥1 条** |
| 操作指引 | `uiOutput.consolidatedDecision.nextSteps[]` | 下一步怎么做；**不含 CHOOSE 选项** |

CHOOSE 选项单独放在 `uiOutput.presentation.humanDecisionPointsFlat[]`。

---

## 2. 请求

### 2.1 Headers

```
Content-Type: application/json
Authorization: Bearer <token>   // 可选，部分端点 Public
```

### 2.2 Body

```typescript
interface PlanningWorkbenchExecuteRequest {
  context: {
    destination: {
      country?: string;   // 至少填 country | city | region 之一
      city?: string;
      region?: string;
    };
    days: number;         // ≥ 1，必填
    travelMode?: 'self_drive' | 'public_transit' | 'walking' | 'mixed';
    mustDo?: string[];
    mustAvoid?: string[];
    constraints?: Record<string, unknown>;  // budget / fitness / time 等
  };
  tripId?: string;                    // Prisma 行程 ID
  userAction?: 'generate' | 'compare' | 'commit' | 'adjust';  // 默认 generate
  existingPlanState?: PlanState;      // 多步流程回传
  skeletonOptions?: PlanSkeletonSet;  // compare/commit 用
  selectedOptionId?: string;          // commit 用
  paceFeedback?: 'too_tired' | 'too_rushed' | 'too_relaxed';  // adjust 必填
  metadata?: {
    contextPackageId?: string;
    scheduleRevision?: number;
    constraintSnapshotId?: string;
    userId?: string;
    tripRunId?: string;
    taskId?: string;
  };
}
```

### 2.3 各 action 语义校验（400）

| userAction | 条件 | errorCode |
|------------|------|-----------|
| adjust | 缺 paceFeedback | MISSING_PACE_FEEDBACK |
| compare | 骨架方案 < 2 个 | MISSING_SKELETON_OPTIONS |
| commit | 无 skeletonOptions | MISSING_SKELETON_OPTIONS |
| commit | 无 selectedOptionId | MISSING_SELECTED_OPTION |
| commit | selectedOptionId 不在 options 中 | SELECTED_OPTION_NOT_FOUND |

- **compare / commit** 可省略 body 中的 `skeletonOptions`：若 `existingPlanState.metadata.skeletonOptions` 已有 generate 结果即可。
- **commit** 可省略 `selectedOptionId`：若 `metadata.recommendedOptionId` 或 `metadata.comparison.recommendation.optionId` 已有。

### 2.4 请求示例

**generate**

```bash
curl -X POST "http://localhost:3000/api/planning-workbench/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "destination": { "country": "冰岛" },
      "days": 5,
      "travelMode": "self_drive",
      "constraints": { "budget": { "total": 50000, "currency": "CNY" } }
    },
    "userAction": "generate"
  }'
```

**compare**（多步：把上一步 planState 回传）

```bash
curl -X POST "http://localhost:3000/api/planning-workbench/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "destination": { "country": "冰岛" }, "days": 5 },
    "userAction": "compare",
    "existingPlanState": { "...": "generate 返回的 planState" }
  }'
```

**commit**

```bash
curl -X POST "http://localhost:3000/api/planning-workbench/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "destination": { "country": "冰岛" }, "days": 5 },
    "userAction": "commit",
    "tripId": "trip_xxx",
    "selectedOptionId": "balanced_1",
    "existingPlanState": { "...": "含 metadata.skeletonOptions" }
  }'
```

---

## 3. 响应

### 3.1 包装结构

```typescript
interface ApiResponse {
  success: boolean;
  data: {
    planState: PlanState;
    uiOutput: WorkbenchUiOutput;
  };
}
```

### 3.2 uiOutput 核心字段

```typescript
interface WorkbenchUiOutput {
  // ── 决策三层（前端主消费） ──
  consolidatedDecision?: {
    status: 'ALLOW' | 'NEED_CONFIRM' | 'SUGGEST_REPLACE' | 'REJECT';
    summary: string;      // 层1：风险事实
    nextSteps: string[];  // 层3：操作指引
  };
  confirmations?: string[];  // 层2：用户签收

  // ── 单主角表达 ──
  presentation?: GuardianPersonaPresentation;  // 与 personas.presentation 相同
  personas?: PersonaShellOutput;

  // ── CHOOSE 选项（不在 nextSteps / confirmations 里） ──
  // presentation.humanDecisionPointsFlat: string[]
  // presentation.humanDecisionPoints: { id, question, options[], recommendation? }[]

  // ── 辅助 ──
  timestamp?: string;              // ISO8601
  decisionContext?: {
    tripId?: string;
    planId?: string;
    planVersion?: number;
    gateStatus?: string;
    contextPackageId?: string;
    scheduleRevision?: number;
    constraintSnapshotId?: string;
  };
  budgetPreview?: {
    totalEstimate?: number;
    currency?: string;
    vsLimit?: number;       // 0~2，占预算比例
    evaluated: boolean;
    band: 'healthy' | 'warning' | 'critical';
    message?: string;       // 中文，如「预估已占预算 92%」
  };

  // ── 按 action 附加 ──
  skeletonOptions?: PlanSkeletonSet;   // generate
  comparison?: OptionComparison;       // compare
  health?: { budget; pace; feasibility };  // 内部健康度
}
```

### 3.3 三层拆分规则

#### summary（风险事实）

- **来源**：`planState.gate.reasons`、预算超支、不可达交通段、三人格 explanation 首句等。
- **不含**「请点击」「勾选」类操作句。

#### confirmations（用户签收）

| status | confirmations |
|--------|---------------|
| ALLOW | `[]` |
| REJECT | `[]` |
| NEED_CONFIRM | **≥ 1 条**，中文可读 |
| SUGGEST_REPLACE | **≥ 1 条**（无候选时回退 `我已了解：{summary 摘要}`） |

**禁止**出现在 confirmations 中（后端已过滤）：

- 流程元指令：`请在上方的决策点…`、`点击提交`、`勾选…后点击`
- debug / 内部 ID：`plan_xxx`、`trip_run`、`dominant_cid`、`[DEBUG]`、`kernel`、`metadata.` 等
- CHOOSE 选项文案（如 `紧凑型 — 南岸环线`）
- 与 summary 重复的句子

#### nextSteps（操作指引）

| 场景 | 典型 nextSteps |
|------|----------------|
| 有效 CHOOSE（≥2 真实选项） | `在决策卡片中选择一项方案` / `完成选择后点击提交` |
| NEED_CONFIRM | `勾选全部确认项` / `确认后点击提交方案` |
| REJECT / 硬阻断 | Abu recommendations 中的 remediation，或 `请先处理安全问题…` |
| ALLOW | `确认无误后点击提交，将方案写入行程` |
| SUGGEST_REPLACE | `根据风险摘要调整方案…` / `调整后重新生成并对比方案` |

### 3.4 门禁（gate）与 status

```
hardConstraintBlocked === true
  → status = REJECT
  → 清空 CHOOSE（humanDecisionPointsFlat）
  → confirmations = []

有效 CHOOSE（≥2 非占位选项）
  → status = NEED_CONFIRM
  → 选项在 presentation.humanDecisionPointsFlat
```

### 3.5 Segment 展示 enrich

`planState.itinerary.segments[]` 附加：

```typescript
metadata: {
  name?: string;           // "雷克雅未克 → 维克"
  fromName?: string;
  toName?: string;
  stops?: string[];
  primaryPoiTitle?: string;
  // 原有 elevation / geoFeatures / hazards 等保留
}
```

### 3.6 响应示例（NEED_CONFIRM + CHOOSE）

```json
{
  "success": true,
  "data": {
    "planState": {
      "plan_id": "plan_1707123456789",
      "gate": { "status": "NEED_CONFIRM", "reasons": ["预算预估超出 3200 CNY"] },
      "itinerary": {
        "segments": [{
          "metadata": {
            "name": "雷克雅未克 → 南岸",
            "fromName": "雷克雅未克",
            "toName": "南岸"
          }
        }]
      }
    },
    "uiOutput": {
      "consolidatedDecision": {
        "status": "NEED_CONFIRM",
        "summary": "预算预估超出 3200 CNY，需确认是否接受。",
        "nextSteps": ["勾选全部确认项", "确认后点击提交方案"]
      },
      "confirmations": ["是否接受当前预算超支预估？"],
      "presentation": {
        "actions": { "user": "CHOOSE", "abu": "ADVISE" },
        "humanDecisionPointsFlat": [
          "紧凑型 — 南岸精华",
          "均衡型 — 环岛经典",
          "深度型 — 高地延伸"
        ],
        "leadSpeaker": "ABU",
        "headline": "…",
        "narrative": "…"
      },
      "decisionContext": {
        "planId": "plan_1707123456789",
        "gateStatus": "NEED_CONFIRM"
      },
      "budgetPreview": {
        "evaluated": true,
        "totalEstimate": 53200,
        "currency": "CNY",
        "vsLimit": 1.06,
        "band": "warning",
        "message": "预估已占预算 106%"
      },
      "timestamp": "2026-06-27T08:00:00.000Z"
    }
  }
}
```

### 3.7 响应示例（REJECT 硬阻断）

```json
{
  "consolidatedDecision": {
    "status": "REJECT",
    "summary": "F 路当前封闭，高地段无法通行。",
    "nextSteps": ["改走 1 号公路南岸线", "或缩短行程去掉高地段"]
  },
  "confirmations": [],
  "presentation": {
    "hardConstraintBlocked": true,
    "actions": { "abu": "BLOCK" }
  }
}
```

---

## 4. 前端集成建议

```typescript
// 读风险
const { summary, status, nextSteps } = data.uiOutput.consolidatedDecision ?? {};

// 读签收（NEED_CONFIRM 时渲染 checkbox 列表）
const signOffs = data.uiOutput.confirmations ?? [];

// 读 CHOOSE 选项
const chooseOptions = data.uiOutput.presentation?.humanDecisionPointsFlat ?? [];

// 门禁
const blocked = data.uiOutput.presentation?.hardConstraintBlocked === true;
const needSignOff = status === 'NEED_CONFIRM' && signOffs.length >= 1;
const needChoose = chooseOptions.length >= 2;
```

多步流程：每次请求把上次 `data.planState` 作为 `existingPlanState` 回传。

**commit 审计**：`userAction: commit` 时传 `confirmedItems[]`（用户勾选的 confirmations）。

**commit 必传**：`existingPlanState` 必须为上一轮 generate/compare 的 `planState`；`tripId` 必填。

**commit 多方案**：用户 CHOOSE 选了非推荐项时，须显式传 `selectedOptionId`（前端在 CHOOSE 写回后记录 optionId）。

**adjust**：`userAction: adjust` 时必传 `paceFeedback`（`too_tired` | `too_rushed` | `too_relaxed`）。

**generate 异步**：优先 `POST /execute-async` + 轮询 `GET /tasks/:taskId/status`；404/501 时回退同步 execute。

**本仓库实现**：Plan Gate 直接渲染 `uiOutput.confirmations[]` 为 checkbox 问句；`summary` 仅展示在「风险说明」。无 confirmations 时不拼 summary 兜底签收句。UX 辅助见 `src/lib/planning-workbench-ux.util.ts`；错误码见 `src/lib/planning-workbench-error-map.ts`。

---

## 5. 错误响应

**结构校验失败**（class-validator）

```json
{
  "statusCode": 400,
  "message": ["context.days must not be less than 1", "..."],
  "error": "Bad Request"
}
```

**语义校验失败**

```json
{
  "statusCode": 400,
  "message": {
    "errorCode": "MISSING_SKELETON_OPTIONS",
    "message": "compare 需要至少 2 个骨架方案：..."
  }
}
```

**服务端异常**

```json
{
  "success": false,
  "error": { "code": "INTERNAL_ERROR", "message": "..." }
}
```

---

## 6. 异步模式

| 步骤 | 接口 | 说明 |
|------|------|------|
| 1 | `POST /api/planning-workbench/execute-async` | 202，返回 taskId |
| 2 | `GET /api/planning-workbench/tasks/:taskId/status` | 轮询至 COMPLETED |
| 3 | `data.result` | 与同步 execute 的 `data` 结构相同（含 enrich 三层） |

建议轮询：初始 1s，最大 5s，超时 120s。
