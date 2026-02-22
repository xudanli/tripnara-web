# 冲突与证据联动高亮 - 前端使用说明

## 1. 概述

冲突列表与证据列表、行程时间轴之间存在联动高亮关系，通过以下字段实现：

| 来源 | 字段 | 用途 |
|------|------|------|
| 冲突 | `conflict.evidenceIds` | 在证据列表中高亮对应证据 |
| 证据 | `evidence.affectedItemIds` | 在行程时间轴中高亮对应行程项 |
| 闭园风险 | `conflict.evidenceIds[0]` ↔ `evidence.id` | 一一对应 |

## 2. 后端接口要求

### 2.1 GET /trips/:id/conflicts

冲突对象需包含 `evidenceIds`：

```json
{
  "conflicts": [
    {
      "id": "conflict-1",
      "type": "CLOSURE_RISK",
      "severity": "HIGH",
      "affectedItemIds": ["item-1", "item-2"],
      "evidenceIds": ["evidence-abc"]
    }
  ]
}
```

- **evidenceIds**：关联的证据 ID 列表。点击冲突时，前端用此列表在证据列表中高亮对应证据。
- **闭园风险**：`evidenceIds` 通常仅含一个元素，与 `evidence.id` 一一对应。

### 2.2 GET /trips/:id/evidence

证据对象需包含 `affectedItemIds`：

```json
{
  "items": [
    {
      "id": "evidence-abc",
      "type": "opening_hours",
      "affectedItemIds": ["item-1", "item-2"]
    }
  ]
}
```

- **affectedItemIds**：受该证据影响的行程项 ID 列表。点击证据时，前端用此列表在行程时间轴中高亮对应行程项。

## 3. 前端使用示例

### 3.1 冲突列表 → 证据高亮

当用户点击冲突项时：

```ts
// conflict.evidenceIds 可用来在证据列表中高亮对应证据
if (conflict.evidenceIds?.length > 0) {
  setActiveTab('evidence');
  setHighlightItemId(conflict.evidenceIds[0]);
}
```

### 3.2 证据列表 → 行程项高亮

当用户点击证据项时：

```ts
// evidence.affectedItemIds 可用来在行程中高亮对应行程项
if (evidence.affectedItemIds?.length) {
  setHighlightItineraryItemIds(evidence.affectedItemIds);
}
```

### 3.3 闭园风险映射

闭园风险场景下，`conflict.evidenceIds[0]` 与 `evidence.id` 一一对应，可直接用于定位并高亮对应营业时间证据。

## 4. 实现位置

| 功能 | 文件 |
|------|------|
| 冲突 → 证据高亮 | `src/pages/plan-studio/ScheduleTab.tsx`（handleFixConflict） |
| 证据 → 行程项高亮 | `src/components/layout/DashboardLayout.tsx`（onEvidenceClick） |
| 证据 Drawer 点击 | `src/components/layout/EvidenceDrawer.tsx` |
| 行程项高亮样式 | `src/components/plan-studio/ItineraryItemRow.tsx`（highlighted） |
