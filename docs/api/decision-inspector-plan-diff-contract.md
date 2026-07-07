# decision-inspector · planDiff 契约（设计稿 SSOT）

**Schema:** `tripnara.planning_decision_inspector@v1` → `planDiff`  
**用途：** 决策空间右栏「方案差异」Tab  
**前端：** `normalize-planning-decision-inspector.ts` → `planDiffViewFromInspector()` → `DecisionSpacePlanDiffPanel`

**相关文档：** [decision-space-bundle.md](./decision-space-bundle.md) · [plan-studio-arrange-itinerary-handoff.md](./plan-studio-arrange-itinerary-handoff.md) · [planning-workbench-decision-checker-api.md](./planning-workbench-decision-checker-api.md)

---

## 设计稿 ↔ 数据结构

```
┌─────────────────────────────────────────────────────────┐
│ 决策检查器 · Tab「方案差异」                              │
├─────────────────────────────────────────────────────────┤
│ ① 将写入的变更 · {optionBadge}                          │  ← optionBadge + optionTitle
│    ┌────────┬────────┬────────┬────────┐                │
│    │ 项目   │ 原计划 │ 新计划 │ 变化   │                │  ← changeRows[]
│    └────────┴────────┴────────┴────────┘                │
│ ② 影响范围                                              │  ← impactTags[]
│    [修改 3 个时间点] [重算 2 段路线] …                   │
│ ③ 不会变化                                              │  ← unchangedItems[]
│    ✓ 午餐预约保持 12:40                                 │
│ ④ 前后时间轴对比                                        │  ← timelineCompare
│    原计划 ─ ─ ─  10:45 ─5'─ 10:50 …                     │     milestones[].originalTime
│    新计划 ─────  10:25 ─5'─ 10:30 …                     │     milestones[].newTime
│    ┌ 总计节省 20 分钟缓冲 … ─────────────────┐          │     durationAfterMinutes + bannerText
└─────────────────────────────────────────────────────────┘
```

| 设计稿区块 | 字段 | 说明 |
|-----------|------|------|
| 副标题「方案 A · 顺延…」 | `optionBadge` + `optionTitle` | Badge 来自 `decisionPack.options[].badge` |
| ① 变更表 · 项目 | `changeRows[].itemLabel` | 必填 |
| ① 变更表 · 原计划 | `changeRows[].before` | `HH:mm` 或带符号文案如 `-17 分钟`（交通缓冲行） |
| ① 变更表 · 新计划 | `changeRows[].after` | 同上 |
| ① 变更表 · 变化 | `changeRows[].deltaLabel` | 必填，如 `-20 分钟` |
| ① 变化列着色 | `changeRows[].deltaMinutes` | 负值=提前=绿；缓冲行可反色（见下） |
| ② 影响 chips | `impactTags[]` | `tone` 驱动边框/文字色 |
| ③ 不变项列表 | `unchangedItems[]` | 纯文案，前端加 ✓ |
| ④ 上轨（原计划） | `timelineCompare.milestones[].originalTime` | 虚线轴节点 |
| ④ 下轨（新计划） | `timelineCompare.milestones[].newTime` | 实线轴节点 |
| ④ 节点间间隔（新计划轨） | `milestones[].durationAfterMinutes` | 如实线轴 `83'` |
| ④ 节点间间隔（原计划轨） | `milestones[].originalDurationAfterMinutes` | 如虚线轴 `63'`；与上新轨相同时可省略 |
| ④ 底部绿条摘要 | `timelineCompare.bannerText` | 单行结论 |

**着色约定（前端 `planDiffViewFromInspector`）**

| 场景 | 规则 |
|------|------|
| 普通时间点 | `deltaMinutes < 0` → good（绿）；`> 0` → caution（橙） |
| `itemLabel` 含「交通缓冲」 | `before`/`after` 按正负值着色；`deltaLabel` 可单独样式 |
| `impactTags[].tone` | `good` 绿框 · `muted` 灰框 · `caution`/`risk` 暖色 |

**Normalize 硬性要求：** `changeRows` 每行必须同时有 `itemLabel`、`before`、`after`、`deltaLabel`，缺一整行丢弃。

---

## TypeScript 类型（BFF SSOT）

后端定义见 `frontend-planning-decision-inspector.types.ts`：

```typescript
/** inspector.planDiff — 设计稿四段合一 */
interface PlanningInspectorPlanDiff {
  optionId?: string;
  optionBadge?: string;       // "方案 A"
  optionTitle?: string;       // "顺延下一项开始时间"
  changeRows: PlanningInspectorChangeRow[];
  impactTags: PlanningInspectorImpactTag[];
  unchangedItems: string[];
  timelineCompare: {
    summary?: string;         // 降级文案，非设计稿必显
    milestones: PlanningInspectorTimelineMilestone[];
    bannerText?: string;
  };
}

interface PlanningInspectorChangeRow {
  id: string;
  itemLabel: string;
  before: string;
  after: string;
  deltaLabel: string;
  deltaMinutes?: number;
}

interface PlanningInspectorImpactTag {
  id: string;
  label: string;
  tone: 'good' | 'caution' | 'risk' | 'muted' | 'neutral';
}

interface PlanningInspectorTimelineMilestone {
  id: string;
  label: string;
  originalTime?: string;      // ④ 上轨 HH:mm
  newTime?: string;           // ④ 下轨 HH:mm
  deltaMinutes?: number;      // 有变化才填；不变节点省略
  durationAfterMinutes?: number;
  originalDurationAfterMinutes?: number;
}
```

---

## 前端 ViewModel（Normalize 后）

Panel 只消费 normalize 输出，不直接读 BFF 原始字段。实现类型：`PlanDiffView`（`decision-space-plan-diff-view.util.ts`）

```typescript
/** DecisionSpacePlanDiffPanel props */
interface PlanDiffViewModel {
  header: {
    badge?: string;           // optionBadge
    title: string;            // optionTitle ?? '方案差异'
  };
  /** ① 将写入的变更 */
  changeTable: Array<{
    id: string;
    itemLabel: string;
    before: string;
    after: string;
    deltaLabel: string;
    deltaTone: 'good' | 'bad' | 'neutral' | 'buffer';
  }>;
  /** ② 影响范围 */
  impactTags: Array<{ id: string; label: string; tone: ImpactTagTone }>;
  /** ③ 不会变化 */
  unchangedItems: string[];
  /** ④ 前后时间轴对比 */
  timeline: {
    milestones: Array<{
      id: string;
      label: string;
      originalTime: string;
      newTime: string;
      deltaMinutes?: number;
      durationAfterMinutes?: number;
      originalDurationAfterMinutes?: number;
      unchanged: boolean;     // originalTime === newTime
    }>;
    bannerText?: string;
  };
  isEmpty: boolean;           // changeTable.length === 0
}
```

```typescript
function planDiffViewFromInspector(
  inspector: PlanningDecisionInspector,
): PlanDiffViewModel | null {
  if (inspector.tabEmptyState.planDiff) return null;
  const pd = inspector.planDiff;
  // changeRows 过滤 + deltaTone 推导 …
}
```

---

## 样例 A · 蓝湖 → 教堂（设计稿完整四段）

场景：Day 1 同日交通偏差，方案 A「顺延下一项开始时间」，提前 20 分钟离开蓝湖，交通缓冲 -17 → +3 分钟。

文件：[samples/decision-inspector-plan-diff-blue-lagoon.json](./samples/decision-inspector-plan-diff-blue-lagoon.json)

---

## 样例 B · 斯科加瀑布（单行最小集）

场景：仅 1 个时间点调整，②③④ 仍必现（不可只有变更表）。

文件：[samples/decision-inspector-plan-diff-skogafoss.json](./samples/decision-inspector-plan-diff-skogafoss.json)

---

## 何时返回 / 拉取

| 场景 | 行为 |
|------|------|
| 未选方案 | `tabEmptyState.planDiff = true`，Panel 展示空态 |
| 已选 + preview 未完成 | loading；bundle `meta.deferred` 含 `inspector.planDiff` |
| 已选 + preview 完成 | 返回完整四段结构 |
| problem 模式 | 先 `POST .../preview`，再 `GET inspector` 或 bundle delta |

```
GET /api/trips/:tripId/decision-space-bundle/delta
  ?problemId={id}&optionId={actionId}&include=inspector.planDiff
```

---

## 验收清单（对齐设计稿）

选中方案后，Tab 内**同时**出现：

- [ ] ① 变更表 ≥1 行，四列齐全
- [ ] ② ≥1 个 impact chip
- [ ] ③ ≥1 条不变项
- [ ] ④ 双轨时间轴 + 节点间隔 + 底部摘要

**反模式：** 仅 1 行 summary diff、长期空态、或缺少 ②③④ 任一段。

---

## 后端投影

| 模式 | 函数 | 优先数据源 |
|------|------|-----------|
| `proposal` | `buildInspectorPlanDiff` | `counterfactualRows` + `proposal.changes` |
| `problem` + `optionId` | `buildInspectorPlanDiffFromPreview` | `repairPreview.itineraryDiff` → 降级 `proposedMutations` |

---

## 前端降级（BFF 未就绪时）

| 优先级 | 数据源 | 说明 |
|--------|--------|------|
| 1 | `inspector.planDiff` | SSOT，四段完整结构 |
| 2 | `decisionPack.options[].counterfactualRows` | 中栏 pack 降级 |
| 3 | preview `itineraryDiff` | 仅部分变更行 |

实现：`buildPlanDiffView()` · `resolvePlanDiffFallbackFromPack()` · `DecisionSpacePlanDiffPanel`
