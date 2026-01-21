# RAG API 页面集成指南

## ✅ 已完成的工作

### 1. RAG Hook (`/src/hooks/useRag.ts`)

已创建 `useRag` Hook，提供所有 RAG API 方法的封装：

```typescript
import { useRag } from '@/hooks';

const {
  loading,
  error,
  search,
  retrieve,
  getDestinationInsights,
  getLocalInsight,
  extractComplianceRules,
  getRouteNarrative,
  answerRouteQuestion,
  explainRouteSelection,
} = useRag();
```

### 2. 组件

已创建两个可复用的组件：

#### DestinationInsightsCard
- **位置**: `/src/components/trips/DestinationInsightsCard.tsx`
- **功能**: 显示目的地的特色贴士、隐藏攻略和路线洞察
- **Props**: `placeId`, `tripId?`, `countryCode?`

#### ComplianceRulesCard
- **位置**: `/src/components/trips/ComplianceRulesCard.tsx`
- **功能**: 显示行程的签证和交通合规信息
- **Props**: `tripId`, `countryCodes`, `ruleTypes?`

## 📝 集成示例

### 示例 1: 在行程详情页集成目的地洞察

在 `/src/pages/trips/[id].tsx` 中添加：

```typescript
import DestinationInsightsCard from '@/components/trips/DestinationInsightsCard';

// 在行程项详情中显示
<DestinationInsightsCard
  placeId={item.Place?.id || ''}
  tripId={tripId}
  countryCode={trip.destination?.split(',')[0]?.trim().toUpperCase()}
/>
```

### 示例 2: 在规划工作台集成合规规则

在 `/src/pages/plan-studio/PlanningWorkbenchTab.tsx` 中添加：

```typescript
import ComplianceRulesCard from '@/components/trips/ComplianceRulesCard';

// 在规划工作台显示合规规则
{trip && (
  <ComplianceRulesCard
    tripId={tripId}
    countryCodes={extractCountryCodes(trip.destination)}
    ruleTypes={['VISA', 'TRANSPORT', 'ENTRY']}
  />
)}
```

### 示例 3: 直接使用 Hook

```typescript
import { useRag } from '@/hooks';
import { useState, useEffect } from 'react';

function MyComponent({ placeId, tripId, countryCode }: Props) {
  const { getDestinationInsights, loading, error } = useRag();
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [placeId]);

  const loadInsights = async () => {
    const result = await getDestinationInsights({
      placeId,
      tripId,
      countryCode,
    });
    if (result) {
      setInsights(result);
    }
  };

  return (
    <div>
      {loading && <Spinner />}
      {error && <div>错误: {error}</div>}
      {insights && (
        <div>
          <h3>贴士</h3>
          {insights.insights.tips.map((tip, i) => (
            <div key={i}>{tip.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 示例 4: 获取当地洞察

```typescript
import { useRag } from '@/hooks';

function LocalInsightsPanel({ countryCode, region }: Props) {
  const { getLocalInsight, loading } = useRag();
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [countryCode, region]);

  const loadInsights = async () => {
    const result = await getLocalInsight({
      countryCode,
      tags: ['culture', 'tips', 'food'],
      region,
    });
    if (result) {
      setInsights(result);
    }
  };

  return (
    <div>
      {insights?.insights.map((insight, i) => (
        <div key={i}>
          <p>{insight.content}</p>
          <div>{insight.tags.join(', ')}</div>
        </div>
      ))}
    </div>
  );
}
```

### 示例 5: 回答路线问题

```typescript
import { useRag } from '@/hooks';

function RouteQuestionPanel({ routeDirectionId, tripId }: Props) {
  const { answerRouteQuestion, loading } = useRag();
  const [answer, setAnswer] = useState(null);

  const handleQuestion = async (question: string) => {
    const result = await answerRouteQuestion({
      question,
      routeDirectionId,
      tripId,
    });
    if (result) {
      setAnswer(result);
    }
  };

  return (
    <div>
      <input
        placeholder="问关于路线的问题..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleQuestion(e.currentTarget.value);
          }
        }}
      />
      {answer && (
        <div>
          <p>{answer.answer}</p>
          <div>置信度: {(answer.confidence * 100).toFixed(0)}%</div>
          <div>
            来源:
            {answer.sources.map((s, i) => (
              <div key={i}>{s.source}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🎯 推荐集成位置

### 1. 行程详情页 (`/src/pages/trips/[id].tsx`)

**集成点**:
- 在行程项详情中显示 `DestinationInsightsCard`
- 在行程概览中显示 `ComplianceRulesCard`

**代码位置**:
- 在 `DayItineraryCard` 组件中添加目的地洞察
- 在行程详情页的 Tab 中添加"合规规则"标签页

### 2. 规划工作台 (`/src/pages/plan-studio/PlanningWorkbenchTab.tsx`)

**集成点**:
- 在规划工作台侧边栏显示合规规则
- 在生成方案后自动提取合规规则

**代码位置**:
- 在 `PlanningWorkbenchTab` 中添加合规规则卡片
- 在 `executeWorkbenchAction` 成功后调用 `extractComplianceRules`

### 3. 国家详情页 (`/src/pages/countries/[countryCode].tsx`)

**集成点**:
- 显示当地洞察信息
- 显示 Rail Pass 规则（如果适用）

**代码位置**:
- 在国家详情页添加"当地洞察"部分
- 使用 `getLocalInsight` 获取洞察信息

### 4. 路线相关页面

**集成点**:
- 显示路线叙事
- 回答路线问题
- 解释路线选择

**代码位置**:
- 在路线详情页使用 `getRouteNarrative`
- 在路线对比功能中使用 `explainRouteSelection`

## 🔧 工具函数

### 提取国家代码

```typescript
function extractCountryCodes(destination: string): string[] {
  if (!destination) return [];
  const parts = destination.split(',');
  const countryCode = parts[0]?.trim().toUpperCase();
  return countryCode ? [countryCode] : [];
}
```

### 格式化标签

```typescript
function formatTags(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
}
```

## 📊 状态管理建议

### 使用 React Query（可选）

如果需要缓存和自动刷新，可以考虑使用 React Query：

```typescript
import { useQuery } from '@tanstack/react-query';
import { ragApi } from '@/api/rag';

function useDestinationInsights(placeId: string, tripId?: string) {
  return useQuery({
    queryKey: ['destination-insights', placeId, tripId],
    queryFn: () =>
      ragApi.getDestinationInsights({
        placeId,
        tripId,
      }),
    enabled: !!placeId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}
```

## 🎉 完成状态

- ✅ RAG Hook 已创建
- ✅ 目的地洞察组件已创建
- ✅ 合规规则组件已创建
- ✅ 集成指南已编写

现在可以在页面中集成这些组件和 Hook 了！
