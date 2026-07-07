# road_class 超长距离文案 · 后端需求

> **现象**：用户 PATCH `c_max_segment_distance` 为 380km 后，左侧约束显示 380，但 `planning-conflicts` / 决策检查器仍显示 `超长距离行驶(>250km)…`。  
> **根因**：`road_class` 冲突 message 写死冰岛国家默认 250km，未读用户约束；聚合缓存未随 `constraintsVersion` 失效。  
> **关联前端**：`readMaxSegmentDistanceKmFromConstraint`、`refreshRoadClassTransportMessage`（过渡兜底，后端修好后前端直接展示 BFF 文案）。

**最后更新**: 2026-06-30

---

## 1. 阈值真源

生成 `road_class` / `long_distance` 叙述时**统一**走：

```ts
resolveSegmentDistanceThresholds({ destination, metadata })
// → thresholds.maxSegmentDistanceKm
// 对应 c_max_segment_distance → metadata.constraints.maxSegmentDistanceKm
```

拼门槛文案：

```ts
longDistanceHighMessage(thresholds.maxSegmentDistanceKm)
// 例：「超长距离行驶(>380km)」
```

**禁止**在 message / finding 中写死 `250`。`250` 仅是冰岛等国家默认，在用户已 PATCH 约束时必须用用户上限。

---

## 2. planning-conflicts 缓存

| 项 | 要求 |
|----|------|
| 缓存键 | 必须包含 `constraintsVersion`（及 tripId / planId 等既有维度） |
| 失效 | `PATCH /trips/:id/constraints/*` 递增 `constraintsVersion` 后，旧聚合不得复用 |
| Query | `GET .../planning-conflicts?constraintsVersion=N` — 版本不匹配时 `isStale: true` 或重算 |

前端已将 `constraintsVersion` 写入 React Query key（`cv`）并随请求透传。

---

## 3. findingToIssue 兜底

`findingToIssue`（feasibility / conflicts 投影链）对 `issueKind: road_class`：

```ts
refreshRoadClassTransportMessage(finding.message, thresholds.maxSegmentDistanceKm)
```

避免历史 finding 或缓存条目携带过期 `>250km` 门槛。

---

## 4. 验收用例

| 条件 | 期望 |
|------|------|
| `c_max_segment_distance = 380`，路段 462km | **仍报冲突**（462 > 380） |
| 冲突文案 | `>380km`，**不是** `>250km` |
| 约束 PATCH 后 | `planning-conflicts` / `decision-checker` 首包或短轮询内更新文案 |
| `constraintsVersion` 变更 | 不返回上一版聚合中的旧门槛 |

测试行程（联调）：`3e4a1058-9218-467f-988a-c18008a14385`（冰岛 6 日 · 米湖→迪尔餐厅约 462km）。

---

## 5. 前端约定（勿重复业务逻辑）

- **不**用写死 `250` 做冲突判断或展示门槛。
- 左侧约束：读 `GET /trips/:id/constraints` 中 `c_max_segment_distance`。
- 冲突/决策检查器：优先展示 BFF `message`；在后端未部署前，前端用 `refreshRoadClassTransportMessage` 按**已加载约束值**做展示兜底（非默认 250）。
- `constraintsVersion` 变更后：`invalidateWorkbenchAfterConstraintChange`（含 constraints 列表 + planning-conflicts）+ 新 `cv` 重拉。

### 前端联调流程（已实现）

1. `PATCH c_max_segment_distance` → `handleConstraintSaved` 刷新 constraints 列表（拿新 `meta.constraintsVersion`）。
2. `usePlanningConflicts` 请求：`GET .../planning-conflicts?constraintsVersion=<cv>&includeConstraintsSummary=1&includeDecisionChecker=1`（React Query key `cv` 同步）。
3. 响应 `constraintsVersion: 4`（示例）且 `isStale: false` → 462km 路段文案为 `>380km`。
4. 若 query `cv` 落后：响应 `isStale: true` → `usePlanningConflicts` 自动 `invalidate constraints` + `invalidate planning-conflicts` 重拉。

联调脚本：`scripts/harness-road-class-segment-distance-live.sh [tripId]`

---

## 6. 建议后端文件（参考命名）

- `utils/segment-distance-threshold.util.ts` — `resolveSegmentDistanceThresholds`
- `utils/road-class-message.util.ts` — `longDistanceHighMessage`, `refreshRoadClassTransportMessage`
- `services/planning-conflicts.service.ts` — 缓存键含 `constraintsVersion`
- `utils/feasibility-finding.projection.util.ts` — `findingToIssue` road_class 分支
