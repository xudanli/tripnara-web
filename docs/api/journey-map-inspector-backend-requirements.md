# 全程地图检查器 · 后端接口需求

> **前端**：`FullJourneyMapInspector` · `build-inspector-view-model.ts`  
> **BFF 入口**：`GET /api/trips/:tripId/journey-map?fields=full&include=inspector`  
> **关联**：[`journey-map-bff-api.md`](./journey-map-bff-api.md)

---

## 加载策略

| 阶段 | 请求 | 检查器数据 |
|------|------|-----------|
| 首屏 | `?fields=minimal` | 无 inspector（仅地图 + 侧栏） |
| 二段 | `?fields=full&include=inspector` | `inspector` + 可选 `activityContexts[]` |

选中地图活动时，前端从 **BFF 已加载数据** 组装 5 个 Tab；缺字段时用 `coverage` / `decision-checker` / 活动字段 **推算 fallback**（演示模式用 demo 富化）。

---

## 五个 Tab · 字段消费

### 1. 活动详情

| 字段 | 来源 | 说明 |
|------|------|------|
| `itineraryItems[]` + `Place` | BFF shell | 时间、地点、类型 |
| `coverage.pois[]` | BFF | 选中 POI 时走 `CoveragePoiInspector` |
| **`inspector.activityContexts[].activityDetail`** | 可选 BFF | 装备、向导、摘要、强度分等扩展 |

**活动详情扩展（建议 `activityDetail`）**

```json
{
  "activityId": "item-uuid",
  "activityTypeLabel": "冰川徒步 / 高强度 / 户外",
  "durationHours": 3.5,
  "transportMinutes": 100,
  "equipment": ["冰爪", "头盔"],
  "weatherWindow": "6–10°C，风速 < 15 km/h",
  "guideInfo": "Guide Arnar · 持证冰川向导",
  "intensityScore": 4,
  "summary": "活动摘要…"
}
```

---

### 2. 参与人

| 字段 | 来源 | 说明 |
|------|------|------|
| `members[]` | BFF | 成员列表 |
| `itineraryItems[].participantIds` | BFF | 参与 / 未参与 |
| **`inspector.activityContexts[].memberRows`** | 推荐 BFF | 每人角色、标签、替代计划 |
| **`inspector.activityContexts[].fitAssessment`** | 推荐 BFF | 适配度、体力、风险、建议 |

**`memberRows[]`**

```json
{
  "memberId": "user-uuid",
  "participating": true,
  "roleLabel": "发起人",
  "tags": ["摄影爱好者", "强体力"],
  "alternativePlan": null
}
```

**`fitAssessment`**

```json
{
  "suitabilityPercent": 92,
  "suitabilityLabel": "非常适配",
  "physicalRequirement": "高",
  "riskLevel": "中",
  "weatherImpact": "中",
  "suggestion": "多数成员体力匹配…"
}
```

**读源**：`SplitPlanService` 分支成员 + `pacingConfig` / 协作者 metadata。

---

### 3. 分流

| 字段 | 来源 | 说明 |
|------|------|------|
| `diversions[]` | BFF | 分流计划 + 几何（已有） |
| **`inspector.activityContexts[].diversionDetail`** | 推荐 BFF | 概览、集合点、应急联系、A/B 组明细 |

**`diversionDetail`（与 `diversions[]` 互补，按 activityId 索引）**

```json
{
  "activityId": "item-hike",
  "overview": "Day 3 上午在瓦特纳区域分流…",
  "splitTime": "10:00 – 13:30",
  "meetingPoint": "瓦特纳冰川停车场",
  "meetingTime": "13:30",
  "emergencyContact": "+354 777 1234",
  "emergencyNote": "天气变化时优先联系向导…",
  "groupA": {
    "label": "A组 · 冰川徒步",
    "badge": "主活动组",
    "activityType": "高强度 · 户外",
    "timeRange": "10:00 – 13:30",
    "transport": "超级吉普",
    "route": "瓦特纳冰川边缘",
    "estimatedCost": "~$130",
    "riskLevel": "中高",
    "participantCount": 8
  },
  "groupB": { "…": "…" }
}
```

**写操作（P2）**：`PATCH /trips/:id/split-plans/:splitId` — 「编辑分流」按钮。

---

### 4. 证据

| 字段 | 来源 | 说明 |
|------|------|------|
| `inspector.evidence` | BFF | `DecisionCheckerEvidenceDto`（已有） |
| `coverage.dataFreshness` | BFF | 数据来源更新时间 |
| **`inspector.activityContexts[].evidenceSources`** | 推荐 BFF | 来源概览行；wire 支持 `{ id, label, status }` 或 `{ id, name, category, updatedAtLabel }` |
| **`weatherSnapshot`** | 推荐 BFF | 天气窗口 + 小时预报 |
| **`routeEvidence`** | 推荐 BFF | 路线耗时 / 距离 / 通行状态 |
| **`activitySource`** | 推荐 BFF | 运营商营业状态 |
| **`evidenceConclusion`** | 推荐 BFF | 可执行 / 需谨慎 / 不可执行 |

**`evidenceConclusion`**

```json
{
  "verdict": "executable",
  "text": "基于当前证据，满足执行条件…"
}
```

**读源**：`DecisionCheckerService` + `CoverageMapService` + 外部 evidence 快照。

---

### 5. 风险与影响

| 字段 | 来源 | 说明 |
|------|------|------|
| `inspector.impact` | BFF | `DecisionCheckerImpactDto`（已有） |
| `inspector.scoreRisks` / `scoreFindings` | BFF | 准备度分解（已有） |
| `coverage.gaps[]` | BFF | 地图风险点 |
| **`inspector.activityContexts[].riskView`** | 推荐 BFF | 聚合风险 Tab 专用视图 |

**`riskView`**

```json
{
  "level": "high",
  "levelLabel": "高风险",
  "score": 72,
  "updatedAt": "2026-06-29T10:18:00Z",
  "affectedCount": 2,
  "totalCount": 4,
  "keyRisks": ["天气变化", "冰面湿滑", "体力消耗", "协调问题"],
  "majorRisks": [
    { "description": "天气快速变化（降雪/强风）", "severity": "高" }
  ],
  "impactScope": {
    "hubs": "2 项",
    "members": "2 / 4 人",
    "time": "+1~2 小时",
    "budget": "$80~$160"
  },
  "mitigations": ["装备检查：冰爪、头盔…", "出发前 3 小时查看预报"]
}
```

**写操作（P2）**：`POST /trips/:id/decision-items` — 「创建决策事项」按钮。

---

## 推荐 BFF 结构

在现有 `JourneyMapInspectorPayload` 上扩展：

```typescript
interface JourneyMapInspectorPayload {
  evidence: DecisionCheckerEvidenceDto | null;
  impact: DecisionCheckerImpactDto | null;
  scoreRisks: ScoreRisk[];
  scoreFindings: ScoreFinding[];
  /** 按 activityId 索引的检查器富化（P1） */
  activityContexts?: JourneyMapInspectorActivityContext[];
}
```

`activityContexts[]` 仅对 **有 inspector 语义的活动**（高强度、分流、有 gaps）生成，避免 N 过大。

---

## 接口优先级

| 优先级 | 接口 / 字段 | Tab |
|--------|------------|-----|
| **P0（已有）** | `inspector.evidence` / `impact` / `scoreRisks` / `scoreFindings` | 证据 / 风险 fallback |
| **P0（已有）** | `members` + `itineraryItems.participantIds` + `diversions` | 参与人 / 分流 fallback |
| **P1** | `inspector.activityContexts[]` 全量 | 五 Tab 对齐设计稿 |
| **P2** | `PATCH split-plans` · `POST decision-items` | 底部操作按钮 |

---

## 独立接口（可选，非 BFF 聚合）

若 BFF 二段过慢，可按 activity 懒加载：

```
GET /api/trips/:tripId/journey-map/inspector/activities/:activityId
```

响应 = 单个 `JourneyMapInspectorActivityContext` + 共享 `evidence/impact` 引用。

支持 `If-None-Match`（与 journey-map etag 或 activity 级 etag 一致）。

---

## 前端消费（已实现）

二段请求 `GET /trips/:id/journey-map?fields=full&include=inspector` 返回后：

1. `useJourneyMapData` 将 `inspector.activityContexts` 写入 `JourneyMapInspectorBundle`
2. `resolveInspectorActivityContext(activity, contexts, members)` 按 `activityId` / `item-{id}` / `poi-{id}` 匹配
3. 五 Tab 优先读匹配到的 context 字段；`activityContexts` 非空时关闭 demo 硬编码 fallback

---

- [ ] 选中 Day 3 冰川活动，五 Tab 均有内容（非空态）
- [ ] 无 `activityContexts` 时，前端 fallback 仍可展示（当前已实现）
- [ ] BFF 提供 `activityContexts` 后，前端优先 BFF，不再展示 demo 硬编码角色名
- [ ] `evidenceConclusion.verdict` 与 gate 四态一致（executable → ALLOW 语义）

---

## 相关文档

- [`journey-map-bff-backend-requirements.md`](./journey-map-bff-backend-requirements.md)
- 决策检查器 DTO：`src/types/decision-checker.ts`
