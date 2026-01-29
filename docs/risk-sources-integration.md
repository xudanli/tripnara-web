# 风险预警官方来源集成指南

## 概述

本文档说明如何在前端集成风险预警的官方来源（sources）功能。该功能允许前端显示每个风险项关联的官方信息来源，提升信息的可信度和可追溯性。

## API 响应结构

### 风险项（EnhancedRisk）

每个风险项现在包含 `sources` 字段，用于存储关联的官方来源：

```typescript
interface EnhancedRisk {
  // ... 其他字段
  sources?: RiskSource[];  // 🆕 官方来源列表
}

interface RiskSource {
  sourceId: string;        // 来源ID（如 "src.safetravel.is"）
  authority: string;       // 权威机构名称（如 "SafeTravel Iceland"）
  title?: string;          // 来源标题（如 "冰岛旅行安全信息"）
  canonicalUrl?: string;   // 规范URL（如 "https://www.safetravel.is/"）
}
```

### 风险预警响应（RiskWarningsResponse）

响应中包含 `packSources` 字段，包含所有风险的官方来源列表（去重后）：

```typescript
interface RiskWarningsResponse {
  tripId: string;
  risks: EnhancedRisk[];
  packSources?: RiskSource[];  // 🆕 所有风险的官方来源列表（去重后）
  summary: {
    // ... 其他统计信息
  };
}
```

## API 响应示例

```json
{
  "success": true,
  "data": {
    "tripId": "trip_123",
    "risks": [
      {
        "id": "risk_1",
        "typeLabel": "极端天气",
        "severity": "high",
        "description": "冰岛天气条件极端，可能出现暴风雪、强风等恶劣天气",
        "sources": [
          {
            "sourceId": "src.safetravel.is",
            "authority": "SafeTravel Iceland",
            "title": "冰岛旅行安全信息",
            "canonicalUrl": "https://www.safetravel.is/"
          }
        ]
      }
    ],
    "packSources": [
      {
        "sourceId": "src.safetravel.is",
        "authority": "SafeTravel Iceland",
        "canonicalUrl": "https://www.safetravel.is/"
      }
    ],
    "summary": {
      "totalRisks": 1,
      "highSeverity": 1,
      "mediumSeverity": 0,
      "lowSeverity": 0
    }
  }
}
```

## 前端集成

### 1. 类型定义

类型定义已更新在 `src/api/readiness.ts`：

```typescript
import type { EnhancedRisk, RiskSource, RiskWarningsResponse } from '@/api/readiness';
```

### 2. 显示官方来源

`RiskCard` 组件已更新，会自动显示每个风险项的官方来源：

```tsx
import RiskCard from '@/components/readiness/RiskCard';

<RiskCard risk={risk} />
```

### 3. UI 展示效果

官方来源会显示在风险卡片的底部，格式如下：

```
🌨️ 极端天气 [高]
描述：冰岛天气条件极端...

📚 官方来源：
  • SafeTravel Iceland - 冰岛旅行安全信息
    🔗 https://www.safetravel.is/
```

### 4. 自定义显示

如果需要自定义官方来源的显示方式，可以访问 `risk.sources`：

```tsx
{risk.sources && risk.sources.length > 0 && (
  <div className="sources-section">
    <h4>官方来源</h4>
    {risk.sources.map((source, index) => (
      <div key={source.sourceId || index}>
        <span>{source.authority}</span>
        {source.title && <span> - {source.title}</span>}
        {source.canonicalUrl && (
          <a href={source.canonicalUrl} target="_blank" rel="noopener noreferrer">
            {source.canonicalUrl}
          </a>
        )}
      </div>
    ))}
  </div>
)}
```

### 5. 显示所有来源汇总

如果需要显示所有风险的来源汇总（`packSources`），可以使用：

```tsx
{riskWarningsResponse.packSources && riskWarningsResponse.packSources.length > 0 && (
  <div className="all-sources-section">
    <h3>所有官方来源</h3>
    <ul>
      {riskWarningsResponse.packSources.map((source, index) => (
        <li key={source.sourceId || index}>
          <a href={source.canonicalUrl} target="_blank" rel="noopener noreferrer">
            {source.authority}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

## 后端实现要求

### ReadinessChecker 修改

在提取 risks 时，需要关联 Pack 的 sources：

```java
// 伪代码示例
for (Risk risk : risks) {
    if (risk.getSourcePackType() != null) {
        CapabilityPack pack = getPackByType(risk.getSourcePackType());
        if (pack != null && pack.getSources() != null) {
            risk.setSources(pack.getSources());
        }
    }
}
```

### getRiskWarnings 接口修改

收集所有风险的 sources，去重后作为 `packSources`：

```java
// 伪代码示例
Set<RiskSource> allSources = new HashSet<>();
for (Risk risk : risks) {
    if (risk.getSources() != null) {
        allSources.addAll(risk.getSources());
    }
}
response.setPackSources(new ArrayList<>(allSources));
```

### RiskTypeMapperService 修改

`enhanceRisk` 方法需要保留 `sources` 字段：

```java
// 伪代码示例
public EnhancedRisk enhanceRisk(Risk risk) {
    EnhancedRisk enhanced = new EnhancedRisk();
    // ... 其他增强逻辑
    enhanced.setSources(risk.getSources());  // 保留 sources
    return enhanced;
}
```

## 注意事项

1. **字段可选性**：`sources` 和 `packSources` 都是可选字段，前端需要做空值检查
2. **URL 验证**：显示 URL 链接时，建议添加 `target="_blank"` 和 `rel="noopener noreferrer"` 属性
3. **去重逻辑**：后端应确保 `packSources` 中的来源已去重（基于 `sourceId`）
4. **国际化**：`authority` 和 `title` 字段可能需要根据用户语言显示不同内容（当前版本暂不支持，未来可扩展）

## 测试检查清单

- [ ] 风险项正确显示官方来源
- [ ] 多个来源正确显示为列表
- [ ] URL 链接可点击并正确跳转
- [ ] 没有来源的风险项不显示来源部分
- [ ] `packSources` 正确显示所有来源汇总
- [ ] 来源去重正确（相同 `sourceId` 只显示一次）
- [ ] 响应式布局在不同屏幕尺寸下正常显示

## 相关文件

- `src/api/readiness.ts` - API 类型定义
- `src/components/readiness/RiskCard.tsx` - 风险卡片组件
- `src/pages/readiness/index.tsx` - 准备度页面
- `src/components/readiness/ReadinessDrawer.tsx` - 准备度抽屉组件
