# DecisionCase Handoff = FE 验收清单

**日期：** 2026-07-15  
**原则：** 后端可联调；FE **不改架构**，只接字段与验收下列清单。  
**产品边界：** 决策空间 = 已 publish 的 `decision-problems`；机会 inbox = 未过门槛 / 未过 Eligibility。  
**本仓状态：** 队列 `uiGroup` 分组、`CONSTRAINT_WRITEBACK`、`decisionCase` / `constraintHints` / `eligibility` 透传、日驾与 Canonical 去重均已接入；机会层 UI / BLOCKING 引导空态为非阻塞。

---

## 0. 核心链路（不变 · 联调验收主路径）

```
两壳 ensure（车型 + 保险 SHELL）
  → 路线就绪 ENRICHED
  → 用户选 option → resolve
  → CONSTRAINT_WRITEBACK apply
  → re-ensure（可冒出 F-road 等）
  → 队列 revalidate
```

并行不变：

| 层 | 规则 |
|----|------|
| 机会层 | 低 materiality / 未过 Eligibility → 只进 `decision-opportunities`，**默认不进队列** |
| 三闸 | Detection → Eligibility（体能/资格）→ Materiality≥6 才 `published` |
| 去重 | 队列已有 Canonical `EXCESSIVE_DAILY_LOAD` → **不展示** DecisionCase `RULE_TRIGGER.EXCESSIVE_DAILY_DRIVE` |

天气/封路仍走 Canonical L2（WORLD_EVENT），不进体验机会漏斗。

---

## 1. FE 验收清单（文档即 DoD）

### A. 决策空间（只绑 problems）

- [x] **只消费** `GET /api/trips/:tripId/decision-problems` 作为队列数据源
- [x] 识别 DecisionCase；读 `item.decisionCase`（含 `dc_*` problemId）
- [x] 用 **`decisionCase.uiGroup` 枚举**分组（可用 `uiGroupLabelZh`，**勿把中文当枚举键**）
- [x] `actionability.writeChain === 'CONSTRAINT_WRITEBACK'` → resolve → apply
- [ ] BLOCKING 空态引导文案（非阻塞）：两壳未确认时强化「须先选车型+保险」

### B. 两壳 → ENRICHED → Apply → re-ensure

- [ ] 首刷 list：车型 + 保险 SHELL（**靠后端**；FE 已展示 `enrichmentStage`「待完善」）
- [ ] 路线就绪后 ENRICHED（**靠后端**）
- [x] options / `constraintHints.fordingExcluded` 可消费并提示
- [ ] 选车型 → resolve → apply 写回 + RESOLVED（**联调验收**）
- [ ] Apply 后可出现 `dc_froad_*`（**靠后端 re-ensure**）

### C. 条件 P0 卡

- [x] 落地 / 环岛按 `uiGroup` 展示（SELECT，非 INFEASIBILITY）
- [x] 冰川一卡：`executable=false` / 不在 `eligibleOptionIds` → 灰显不可选
- [ ] 高影响体验：过闸在 problems / 未过在机会层（**靠后端 publish 规则**）

### D. 机会层（可选 UI · 不进默认队列）

- [x] API 客户端可读 `GET …/decision-opportunities` + `publish`
- [ ] 机会 inbox UI + `eligible=false` 展示（非阻塞）
- [x] **未过 Eligibility / materiality&lt;6 不得混进默认队列**（FE 不把 opportunities 并进队列）

### E. 去重

- [x] 已有 Canonical `EXCESSIVE_DAILY_LOAD` 时过滤 DecisionCase `EXCESSIVE_DAILY_DRIVE` / `dc_drive_*`
- [x] 落地 / 环岛 / 车型 / 保险 / 冰川不受该去重影响

### F. 近期不必做

- ~~重做决策空间架构~~
- ~~把机会层默认并进队列~~
- ~~用 `INFEASIBILITY` 渲染环岛/落地~~

---

## 2. API（联调表）

| Method | Path | 用途 |
|--------|------|------|
| `GET` | `/api/trips/:tripId/decision-problems` | **决策空间队列**（仅 published） |
| `GET` | `/api/trips/:tripId/decision-opportunities` | 机会 inbox |
| `POST` | `/api/trips/:tripId/decision-opportunities/:opportunityId/publish` | 机会 → Case |
| `GET` | `…/decision-problems/:problemId` | 详情（`decisionCase` + actions） |
| `GET` | `…/decision-problems/:problemId/options` | options + tradeoffs |
| `POST` | `…/decision-problems/:problemId/resolutions` | 选 option |
| `POST` | `…/decision-problems/:problemId/apply` | `CONSTRAINT_WRITEBACK` → re-ensure |

---

## 3. 字段契约（FE 绑定）

见 `src/types/decision-case.ts`；与下列一致：

```typescript
decisionCase?: {
  sourceKind: 'REQUIRED_CHOICE' | 'RULE_TRIGGER' | 'OPPORTUNITY' | 'WORLD_EVENT';
  requiredness: 'BLOCKING' | 'IMPORTANT' | 'OPTIONAL';
  enrichmentStage: 'SHELL' | 'ENRICHED';
  uiGroup: 'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING';
  uiGroupLabelZh: string;
  eligibility?: {
    eligible: boolean;
    reason?: string;
    softWarnings: string[];
    checks: Array<{ code: string; dimension?: string; passed: boolean; detail?: string; message?: string }>;
    eligibleOptionIds?: string[];
  };
};

actionability.writeChain?: 'CONSTRAINT_WRITEBACK';

actions[].constraintHints?: {
  fordingExcluded?: boolean;
  writebackPayload?: Record<string, unknown>;
}
```

| requiredness / 分 | uiGroup | 文案 |
|-------------------|---------|------|
| BLOCKING | MUST_CONFIRM | 必须确认 |
| IMPORTANT 或 6–8 | IMPORTANT_CHOICE | 重要选择 |
| OPTIONAL 已 publish | WORTH_CONSIDERING | 值得考虑 |
| &lt;6 或 ineligible | （不进 problems） | 仅机会层 |

---

## 4–6. 三闸 / P0 Case / Apply

与后端真源一致；FE 只需知边界。详见历史 handoff 表（车辆、保险、F-road、日驾去重、落地、环岛、冰川合并、高影响体验）及 fixture  

`3e4a1058-9218-467f-988a-c18008a14385`。

```bash
TRIP=3e4a1058-9218-467f-988a-c18008a14385
BASE=http://localhost:3000/api
curl -s "$BASE/trips/$TRIP/decision-problems" \
  | jq '.data.items[] | {problemId,title,writeChain:.actionability.writeChain,decisionCase}'
curl -s "$BASE/trips/$TRIP/decision-opportunities" | jq '.data'
```

---

## 7. 验收通过标准（一句话）

FE 能用现有决策空间：**按 `uiGroup` 展示两壳 BLOCKING → ENRICHED → `CONSTRAINT_WRITEBACK` apply → 队列 re-ensure**；机会与不合格 Eligibility 不进默认队列；与 Canonical `EXCESSIVE_DAILY_LOAD` 不双开日驾卡。
