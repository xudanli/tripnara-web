# 规划工作台 · 分流方案 BFF 契约（草案）

> **版本**: 0.1.0  
> **状态**: 待后端实现 · 前端已预留类型与 UI 壳  
> **受众**: BFF / Kernel / Persona / 前端  
> **关联 UI**: 中栏并行时间线、`PlanningWorkbenchDecisionChecker`「分流」Tab、顶栏分流横幅  
> **原则**: 分组、指标、物流、CTA 文案均由 BFF 投影；前端禁止硬编码 demo 分流数据。

**最后更新**: 2026-06-28

---

## 1. 场景与触发

当 Kernel / Persona 检测到 **团队体力差异、偏好不可调和、或并行活动更优** 时，生成「分流方案」：

| 触发示例 | `splitPlan.kind` |
|----------|------------------|
| 年轻组 vs 老年组活动强度差异 | `physical_strength` |
| 部分成员必去 POI、其余休息 | `preference` |
| 天气导致户外/室内分流 | `weather_adaptive` |

**BFF 生成 `daySplits[]` 的前置条件**（当前实现）：

1. 存在 `category: team_fit` 的疲劳/体力类冲突；
2. 对应 Day 上已有 **ItineraryItem**（含 Place / 时段）；
3. BFF 从真实行程项投影 POI 时段到 `segments[].itineraryItemId` / `placeId` / `placeName`。

前端展示条件：

- **预览态**（并行时间线）：`daySplits.length > 0` 且 `splitPlanId` 与 `splitPlan.id` 一致；
- **已应用态**（单线日程）：`daySplits` 为空；ItineraryItem.note 首行含分流标记（见 §4.2）。

---

## 2. 接口分布

```
GET /trips/:tripId/decision-checker          ← splitPlan 读模型（右栏「分流」Tab）
GET /trips/:tripId/planning-conflicts        ← daySplits[]（中栏并行时间线）
     ?includeDecisionChecker=1               ← 可嵌入 decisionChecker.splitPlan
```

| 字段 | 接口 | 用途 |
|------|------|------|
| `splitPlan` | decision-checker | 推荐文案、指标、分组摘要、物流、风险、CTA |
| `daySplits[]` | planning-conflicts | 某日 fork/rejoin 并行时间线（与 splitPlan 通过 id 关联） |

**版本指纹**: `splitPlan.snapshotVersion` 须与 `decision-checker.snapshotVersion` 一致；`daySplits[].splitPlanId === splitPlan.id`。

---

## 3. `splitPlan`（decision-checker 扩展）

在 `tripnara.decision_checker@v1` 根对象增加 **可选** 字段：

```typescript
interface DecisionCheckerResponse {
  // ...existing fields
  splitPlan?: DecisionCheckerSplitPlanDto;
}

interface DecisionCheckerSplitPlanDto {
  id: string;
  kind: 'physical_strength' | 'preference' | 'weather_adaptive' | string;
  /** 顶栏 / 中栏横幅 */
  banner: {
    title: string;
    message: string;
    affectedDays: number[];       // 1-based Day 编号
    tone?: 'info' | 'warning';
  };
  /** 右栏标题区 */
  recommendation: {
    title: string;
    summary: string;
    badge?: string;               // 「两组均满意」
    badgeTone?: 'success' | 'warning' | 'neutral';
  };
  /** 体验 +31%、老年疲劳 -48% 等 — 后端格式化 displayValue */
  metrics: DecisionCheckerMetricDto[];
  /** A/B 组摘要（右栏卡片，非完整时间线） */
  groups: DecisionCheckerSplitGroupDto[];
  logistics: DecisionCheckerSplitLogisticsDto;
  risks?: Array<{ title: string; description: string }>;
  aiSuggestion?: DecisionCheckerAiTextDto;
  /** 底部 CTA，顺序即渲染顺序 */
  actions: DecisionCheckerActionDto[];
  snapshotVersion?: string;
}

interface DecisionCheckerSplitGroupDto {
  id: string;
  letter?: string;                // A / B
  label: string;                  // 「年轻人组（8 人）」— 含人数，直接渲染
  memberCount: number;
  members?: PlanningDaySplitMemberDto[];
  activityTitle: string;          // 组主题：「高强度体验」「舒适休息」（非 POI 名）
  segments?: PlanningDaySplitSegmentDto[];  // POI 明细 — 中栏 daySplits 用；右栏摘要不渲染
  highlights: string[];           // ✓ 要点 bullet，如「冰川徒步 4.5 小时」
  intensity?: 'high' | 'medium' | 'low';
  riskLevel?: 'low' | 'medium' | 'high';
  costPerPerson?: string;
  variant?: 'blue' | 'orange' | 'purple';
  avatarUrls?: string[];          // 与 members 二选一或并存；优先 avatarUrls
}

interface PlanningDaySplitMemberDto {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface DecisionCheckerSplitLogisticsDto {
  meetupPoint: string;
  meetupTime: string;             // 「17:30（±15 分钟弹性）」
  transport?: string;
  emergencyContact?: string;
  guideBooking?: string;
  notes?: string[];
}
```

### 3.1 扩展 Action 类型

```typescript
type DecisionCheckerActionType =
  | /* existing */
  | 'apply_split_plan'
  | 'view_split_alternatives'
  | 'discuss_with_nara';
```

| type | payload 建议 | 前端行为 |
|------|-------------|----------|
| `apply_split_plan` | `{ splitPlanId }` | 调用 apply API / 打开确认流 |
| `view_split_alternatives` | `{ splitPlanId }` | 展开 counterfactual.scenarios 或方案矩阵 |
| `discuss_with_nara` | `{ splitPlanId, prompt? }` | 打开 Assistant 并注入上下文 |

### 3.2 响应示例（与设计稿对齐）

```json
{
  "schema": "tripnara.decision_checker@v1",
  "tripId": "3e4a1058-9218-467f-988a-c18008a14385",
  "snapshotVersion": "constraints_v8:plan_v2:split_d3",
  "splitPlan": {
    "id": "split_d3_glacier",
    "kind": "physical_strength",
    "banner": {
      "title": "检测到体力差异，建议分流",
      "message": "Day 3 11:00–16:00 活动强度存在差异，已生成分流方案，确保两组均满意。",
      "affectedDays": [3],
      "tone": "info"
    },
    "recommendation": {
      "title": "推荐分流方案",
      "summary": "年轻人冰川徒步；老年人咖啡店或酒店休息。",
      "badge": "两组均满意",
      "badgeTone": "success"
    },
    "metrics": [
      { "key": "experience_satisfaction", "label": "体验满意度", "displayValue": "+31%", "tone": "good" },
      { "key": "senior_fatigue", "label": "老年疲劳降低", "displayValue": "-48%", "tone": "good" },
      { "key": "team_conflict", "label": "团队冲突降低", "displayValue": "-75%", "tone": "good" },
      { "key": "budget", "label": "预算变化", "displayValue": "+¥900", "tone": "neutral", "raw": { "delta": 900, "unit": "currency", "currency": "CNY" } }
    ],
    "groups": [
      {
        "id": "grp_a",
        "letter": "A",
        "label": "年轻组",
        "memberCount": 8,
        "activityTitle": "冰川徒步体验",
        "highlights": ["4.5h 徒步", "专业向导", "含装备"],
        "intensity": "high",
        "riskLevel": "medium",
        "costPerPerson": "¥880/人",
        "variant": "blue"
      },
      {
        "id": "grp_b",
        "letter": "B",
        "label": "老年组",
        "memberCount": 4,
        "activityTitle": "咖啡店 & 酒店休息",
        "highlights": ["1.5h 咖啡", "3h 酒店休息"],
        "intensity": "low",
        "riskLevel": "low",
        "costPerPerson": "¥220/人",
        "variant": "orange"
      }
    ],
    "logistics": {
      "meetupPoint": "Skógafoss 酒店餐厅",
      "meetupTime": "17:30（±15 分钟弹性）",
      "transport": "两组均返回停车场（已预订）",
      "emergencyContact": "+354 112",
      "guideBooking": "冰川向导 8 人名额已确认"
    },
    "risks": [
      { "title": "天气安全", "description": "徒步需防水装备；恶劣天气可缩短至 3h。" }
    ],
    "aiSuggestion": {
      "text": "若天气恶化，可将徒步时长缩短至 3 小时，B 组可在酒店 SPA 延长休息。",
      "source": "rule"
    },
    "actions": [
      { "type": "apply_split_plan", "label": "应用分流方案", "payload": { "splitPlanId": "split_d3_glacier" } },
      { "type": "view_split_alternatives", "label": "查看备选", "payload": { "splitPlanId": "split_d3_glacier" } },
      { "type": "discuss_with_nara", "label": "与 Nara 讨论", "payload": { "splitPlanId": "split_d3_glacier" } }
    ]
  },
  "counterfactual": { "scenarios": [] }
}
```

> 当 `splitPlan` 存在时，`counterfactual` 可保留备选方案；右栏第四 Tab 前端优先展示「分流」而非「反事实」。

---

## 4. `daySplits[]`（planning-conflicts 扩展）

```typescript
interface PlanningConflictsResponse {
  // ...existing fields
  daySplits?: PlanningDaySplitDto[];
}

interface PlanningDaySplitDto {
  id: string;
  splitPlanId: string;
  dayIndex: number;               // 0-based，与 TripDay 索引对齐
  dayNumber: number;              // 1-based 展示
  title: string;                  // 「冰川徒步日」
  dateLabel?: string;
  stats?: {
    splitDuration?: string;       // 「5 小时」
    meetupTime?: string;
    feasibility?: string;         // 「92%」
    satisfactionBadge?: string;
  };
  /** 分叉锚点：fork.startTime 为并行分支起点；afterSegmentId 对齐 sharedBefore 末段 */
  fork?: { startTime: string; afterSegmentId?: string };
  sharedBefore: PlanningDaySplitSegmentDto[];
  branches: PlanningDaySplitBranchDto[];
  rejoin?: PlanningDaySplitSegmentDto;
  sharedAfter?: PlanningDaySplitSegmentDto[];
}

interface PlanningDaySplitBranchDto {
  id: string;
  groupId: string;                // 对应 splitPlan.groups[].id
  groupLabel: string;             // 「Alice、Bob 等 8 人 · 体能较好」
  memberCount: number;
  members?: PlanningDaySplitMemberDto[];
  variant?: 'blue' | 'orange' | 'purple';
  segments: PlanningDaySplitSegmentDto[];  // 当日 branch 内全部 ItineraryItem
}

interface PlanningDaySplitSegmentDto {
  id: string;
  kind: 'shared' | 'branch' | 'rejoin';
  startTime: string;              // 「08:00」
  endTime?: string;
  title: string;                  // 活动名（note/类型）
  subtitle?: string;
  /** 关联 ItineraryItem.id（有真实 POI 时必填） */
  itineraryItemId?: string;
  placeId?: string;
  placeName?: string;             // POI 名（Place.displayName 投影）
  intensity?: 'high' | 'medium' | 'low';
  riskLevel?: 'low' | 'medium' | 'high';
  costPerPerson?: string;
  highlights?: string[];
}
```

### 4.1 daySplits 示例（Day 3）

```json
{
  "daySplits": [
    {
      "id": "ds_d3",
      "splitPlanId": "split_d3_glacier",
      "dayIndex": 2,
      "dayNumber": 3,
      "title": "冰川徒步日",
      "stats": {
        "splitDuration": "5 小时",
        "meetupTime": "17:30",
        "feasibility": "92%",
        "satisfactionBadge": "两组均满意"
      },
      "sharedBefore": [
        { "id": "seg_depart", "kind": "shared", "startTime": "08:00", "endTime": "10:20", "title": "全员出发 · Skógafoss 停靠" }
      ],
      "branches": [
        {
          "id": "br_a",
          "groupId": "grp_a",
          "groupLabel": "Alice、Bob 等 8 人 · 体能较好",
          "memberCount": 8,
          "members": [
            { "id": "u1", "displayName": "danli xu" },
            { "id": "u2", "displayName": "Danny" }
          ],
          "variant": "blue",
          "segments": [
            {
              "id": "seg_hike",
              "kind": "branch",
              "startTime": "11:00",
              "endTime": "15:30",
              "title": "冰川徒步体验",
              "placeName": "Sólheimajökull",
              "intensity": "high",
              "riskLevel": "medium",
              "costPerPerson": "¥880/人"
            }
          ]
        },
        {
          "id": "br_b",
          "groupId": "grp_b",
          "groupLabel": "Group B · 老年组",
          "memberCount": 4,
          "variant": "orange",
          "segments": [
            { "id": "seg_coffee", "kind": "branch", "startTime": "11:00", "endTime": "15:30", "title": "咖啡店 & 酒店休息", "intensity": "low", "riskLevel": "low", "costPerPerson": "¥220/人" }
          ]
        }
      ],
      "rejoin": {
        "id": "seg_reunion",
        "kind": "rejoin",
        "startTime": "17:30",
        "title": "汇合 · 酒店晚餐",
        "subtitle": "全员 12 人"
      },
      "sharedAfter": [
        { "id": "seg_rest", "kind": "shared", "startTime": "19:30", "title": "返回酒店休息" }
      ]
    }
  ]
}
```

---

## 4.2 ItineraryItem.note 分流标记（apply 后）

`POST .../apply` 成功后 BFF 将分流元数据写入各 **ItineraryItem.note 首行**，行中执行层与规划工作台共用解析：

```
[split_plan:v1]{"splitPlanId":"split_d3_glacier","groupId":"grp_a","groupLabel":"年轻组","phase":"branch","letter":"A"}
可选第二行起为活动备注正文
```

| 字段 | 说明 |
|------|------|
| `splitPlanId` | 与 `splitPlan.id` 一致 |
| `groupId` | 对应 `splitPlan.groups[].id` |
| `groupLabel` | 展示用分组名 |
| `phase` | `shared` \| `branch` \| `rejoin` |
| `letter` | 可选 A/B |

前端解析：`src/lib/itinerary-split-note.util.ts`（`parseItinerarySplitPlanNote` / `hasItinerarySplitPlanNote`）。

简写兼容：`[分流:A|branch]`（legacy）。

---

## 5. 应用分流（写接口）

```
POST /trips/:tripId/split-plans/:splitPlanId/apply
```

**Request**

```json
{
  "constraintsVersion": 8,
  "confirm": true
}
```

**Response 200**

```json
{
  "applied": true,
  "scheduleVersion": "plan_v3",
  "affectedDays": [3]
}
```

失败时返回 409 + `constraintsVersion` 冲突提示，与 constraints PATCH 一致。

---

## 6. BFF 聚合建议

1. Persona / team_fit 冲突 → 候选 splitPlan  
2. Schedule engine 生成 `daySplits` 与 `groups` 活动映射  
3. preview-impact 或 Monte Carlo → `metrics[]`  
4. 物流字段来自预订 / 向导 / 汇合 POI 真源  
5. `counterfactual.scenarios` 保留非分流备选（如「全员缩短徒步」）

---

## 7. 前端对接

### 7.1 `splitPlan.groups[]` → 右栏分流详情卡片

| 设计稿 | API 字段 | 说明 |
|--------|----------|------|
| 年轻人组（8 人） | `label` | 含人数，直接渲染，勿再拼 `memberCount` |
| 高强度体验 | `activityTitle` | 组主题，**非** POI 名 |
| ✓ 冰川徒步 4.5 小时 | `highlights[0]` | 活动名 + 时长 |
| ✓ 专业向导 & 安全保障 | `highlights[1]` | note / 推断 |
| 成员头像 | `avatarUrls` → `members[]` | 与 `daySplits.branches` 同源 |
| POI 明细 | `segments[]` | **仅中栏** `WorkbenchDaySplitTimeline` |

```tsx
// DecisionCheckerSplitTab — 读 splitPlan.groups[]，勿读 conflict issue 标题
groups.map((group) => (
  <SplitGroupCard
    key={group.id}
    label={group.label}
    theme={group.activityTitle}
    highlights={group.highlights}
    avatarUrls={group.avatarUrls}
    members={group.members}
    variant={group.variant}
  />
));
```

### 7.2 中栏分叉 vs 单线（BFF SSOT）

**原则**：后端 BFF 是 SSOT，前端只渲染 DTO，禁止客户端拼 fork/rejoin/汇合时间。

| 区域 | 字段 | 接口 |
|------|------|------|
| 中栏并行时间线 | `daySplits[]` | `GET /planning-conflicts?includeDecisionChecker=1` 首包 |
| 右栏分流卡片 | `splitPlan` | poll ready 后 `decisionChecker.splitPlan` |
| 关联 | `daySplit.splitPlanId === splitPlan.id` | 按 `dayNumber` 取当天 |

```tsx
// poll 合并：ready 后 decisionChecker.daySplits 覆盖首包
const effectiveDaySplits =
  decisionChecker?.daySplits ?? planningConflicts.daySplits;
const daySplit = effectiveDaySplits?.find((d) => d.dayNumber === selectedDayNumber);
const splitPlan = decisionChecker?.splitPlan;
```

**渲染顺序**：`sharedBefore` → `fork` → `branches[]` → `rejoin`（`rejoin.placeName` + `stats.meetupTime`）→ `sharedAfter`

**禁止**：

- ❌ 用 A 组末段活动名（如「钻石沙滩」）当汇合标签
- ❌ 用 B 组酒店 `startTime`（16:14）当汇合时间 — 读 `stats.meetupTime`（20:49）
- ❌ 从扁平 `itineraryItems` 猜 fork/rejoin
- ❌ 自己拼组名 — 用 `branch.groupLabel`

**POI 名**：`seg.placeName ?? seg.title`（后端投影中文 displayName）

```tsx
const daySplit = daySplits?.find(
  (d) => d.dayNumber === selectedDayNumber || d.dayIndex === selectedDayIndex,
);
if (daySplit?.branches?.length >= 2) {
  // sharedBefore → fork → branches 并行 → rejoin → sharedAfter
} else {
  // 普通单线 WorkbenchDayDetailCard
}
```

- `daySplits` 仅冲突日有 1 条（如 Day 1 team_fit）；其他天无 entry → 单线。
- fast 首包（`includeDecisionChecker=1`）现已投影 `daySplits`；`splitPlan` 可 deferred，中栏仍应展示分叉。
- `fork.startTime` / `fork.afterSegmentId` 对齐 sharedBefore 末段与分叉箭头。

### 7.3 组件映射

| 组件 | 数据源 | 状态 |
|------|--------|------|
| `WorkbenchSplitPlanBanner` | `splitPlan.banner` | 仅 `daySplits.length > 0` 时展示 |
| `WorkbenchDaySplitTimeline` | `daySplits[dayIndex].branches[]` | 预览态；渲染 `members` + 全量 `segments`（`placeName` 优先）；**不**并排 AI 决策委员会 |
| `WorkbenchDayDetailCard` | Trip ItineraryItem + note 标记 | apply 后单线；右侧 `WorkbenchPersonaCommitteePanel` |
| `DecisionCheckerSplitTab` | `splitPlan.groups[]` | 图3 摘要卡（highlights + 头像）；**不**展示 POI 时间线 |
| Tab 标签 | 有 `splitPlan` →「分流」 | |

**apply 成功刷新链**：`planning-conflicts.reload()` → `daySplits=[]` → 中栏回 `WorkbenchDayDetailCard`；`tripsApi.getById` + `refreshKey` 拉取带 note 标记的行程项。

---

## 8. 验收清单

- [ ] `splitPlan` 与 `daySplits` 通过 `splitPlanId` 关联一致  
- [ ] metrics 与 preview-impact / Persona 评估数值一致  
- [ ] 应用分流后 `snapshotVersion` 变化，旧快照 `isStale: true`  
- [ ] Day tab 自动高亮 `banner.affectedDays`  
- [ ] CTA `apply_split_plan` 成功后中栏切换为已应用单线日程（或标记已应用分流）
