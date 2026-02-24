# 行程优化 - 不营业地点处理与返回

## 1. 概述

当应用优化结果创建行程项时，若某地点因不营业等原因无法创建，应将该地点加入 `skipped` 数组并返回给前端，由前端提示用户。

## 2. 后端实现（trip-optimization.service.ts）

### 2.1 创建行程项失败时的处理

在应用优化结果、逐个创建行程项时：

- 若创建某行程项失败（例如：地点在目标日期不营业），将 `{ placeId, reason }` 加入 `skipped` 数组
- `reason` 示例：`"Kirkjufell 在 2026-02-22 星期日 不营业"`
- 继续处理其余行程项，不因单个失败而中断

### 2.2 返回结果结构

在 `applied` 对象中增加 `skipped` 字段，**仅在有被跳过项时返回**：

```json
{
  "data": {
    "optimization": { ... },
    "applied": {
      "success": true,
      "appliedItems": 15,
      "modifiedDays": ["2026-02-22"],
      "skipped": [
        { "placeId": 381040, "reason": "Kirkjufell 在 2026-02-22 星期日 不营业" }
      ]
    }
  }
}
```

- `skipped`：可选字段，类型 `Array<{ placeId: number; reason: string }>`
- 当 `skipped` 为空数组或不存在时，前端不显示跳过提示

## 3. 前端处理

- 解析 `applied.skipped`，在应用优化成功后展示给用户
- 提示文案示例：「以下地点因不营业等原因未被加入行程：Kirkjufell（2026-02-22 星期日 不营业）」
