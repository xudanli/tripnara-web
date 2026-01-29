# 冰岛官方信息源接口调用说明

## 📋 概述

冰岛官方信息源接口提供了三个数据源：
- **vedur.is** - 冰岛气象局天气预报
- **safetravel.is** - 冰岛旅行安全信息
- **road.is** - 冰岛道路管理局F路路况

## 🏗️ 架构层次

### 1. API 客户端层 (`src/api/iceland-info.ts`)

最底层，直接调用后端 API：

```typescript
import { icelandInfoApi } from '@/api/iceland-info';

// 获取天气数据
const weather = await icelandInfoApi.getWeather({
  region: 'centralhighlands'
});

// 获取安全信息
const safety = await icelandInfoApi.getSafety({
  region: 'highlands',
  alertType: 'weather'
});

// 获取F路路况
const roads = await icelandInfoApi.getRoadConditions({
  fRoads: 'F208,F26,F910'
});
```

### 2. React Hook 层 (`src/hooks/useIcelandInfo.ts`)

封装了状态管理和自动获取逻辑：

```typescript
import { useIcelandInfo, useIsIcelandTrip } from '@/hooks';

// 在组件中使用
function MyComponent({ trip }) {
  // 判断是否为冰岛行程
  const isIceland = useIsIcelandTrip(trip?.destination);
  
  // 使用 Hook 获取冰岛信息
  const icelandInfo = useIcelandInfo({
    autoFetch: isIceland, // 自动获取
    refreshInterval: 0,  // 不自动刷新
  });
  
  // 访问数据
  const weatherData = icelandInfo.weather.data;
  const safetyData = icelandInfo.safety.data;
  const roadConditionsData = icelandInfo.roadConditions.data;
  
  // 手动获取
  const handleRefresh = () => {
    icelandInfo.fetchAll({
      weather: { region: 'centralhighlands' },
      safety: { region: 'highlands' },
      roadConditions: { fRoads: 'F208,F26' },
    });
  };
  
  return (
    <div>
      {icelandInfo.weather.loading && <div>加载天气中...</div>}
      {icelandInfo.weather.error && <div>错误: {icelandInfo.weather.error}</div>}
      {weatherData && <div>温度: {weatherData.current.temperature}°C</div>}
    </div>
  );
}
```

---

## 🔌 API 接口详情

### 1. 获取天气数据

**接口**: `GET /iceland-info/weather`

**参数**:
```typescript
interface GetWeatherParams {
  region?: 'centralhighlands' | 'southhighlands' | 'northhighlands';
  lat?: number;
  lng?: number;
  includeWindDetails?: boolean;
}
```

**调用示例**:
```typescript
// 方式1: 使用 API 客户端
const weather = await icelandInfoApi.getWeather({
  region: 'centralhighlands',
  includeWindDetails: true,
});

// 方式2: 使用 Hook
const icelandInfo = useIcelandInfo();
const weather = await icelandInfo.weather.fetch({
  lat: 64.5,
  lng: -18.5,
  includeWindDetails: true,
});
```

**返回数据**:
```typescript
interface WeatherData {
  station: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    elevation: number;
  };
  current: {
    datetime: string;
    temperature: number;
    windSpeed: number;
    windDirection: number;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
    // ... 更多字段
  };
  forecast: WeatherForecast[];
  lastUpdated: string;
  source: 'vedur.is';
}
```

---

### 2. 获取安全信息

**接口**: `GET /iceland-info/safety`

**参数**:
```typescript
interface GetSafetyParams {
  region?: string; // 'highlands', 'central-highlands' 等
  alertType?: 'weather' | 'road' | 'travel' | 'general';
}
```

**调用示例**:
```typescript
// 方式1: 使用 API 客户端
const safety = await icelandInfoApi.getSafety({
  region: 'highlands',
  alertType: 'weather',
});

// 方式2: 使用 Hook
const icelandInfo = useIcelandInfo();
const safety = await icelandInfo.safety.fetch({
  region: 'highlands',
});
```

**返回数据**:
```typescript
interface SafetyData {
  alerts: SafetyAlert[];
  travelConditions: TravelCondition[];
  lastUpdated: string;
}

interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  type: 'weather' | 'road' | 'travel' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low';
  effectiveTime: string;
  expiryTime: string;
  regions: string[];
  fRoads?: string[];
}
```

---

### 3. 获取F路路况

**接口**: `GET /iceland-info/road-conditions`

**参数**:
```typescript
interface GetRoadConditionsParams {
  fRoads?: string; // 逗号分隔的F路编号，如 'F208,F26,F910'
  status?: 'open' | 'closed' | 'caution' | 'impassable';
}
```

**调用示例**:
```typescript
// 方式1: 使用 API 客户端
const roads = await icelandInfoApi.getRoadConditions({
  fRoads: 'F208,F26,F910',
  status: 'caution',
});

// 方式2: 使用 Hook
const icelandInfo = useIcelandInfo();
const roads = await icelandInfo.roadConditions.fetch({
  fRoads: 'F208,F26',
});
```

**返回数据**:
```typescript
interface RoadConditionsData {
  fRoads: FRoad[];
  lastUpdated: string;
  source: 'road.is';
}

interface FRoad {
  id: string;
  name: string;
  fRoadNumber: string;
  startPoint: { lat: number; lng: number };
  endPoint: { lat: number; lng: number };
  status: 'open' | 'closed' | 'caution' | 'impassable';
  condition: 'dry' | 'wet' | 'snowy' | 'icy';
  isOpen: boolean;
  description: string;
  lastUpdated: string;
}
```

---

## 📱 实际使用场景

### 场景1: ReadinessDrawer（准备度抽屉）

**位置**: `src/components/readiness/ReadinessDrawer.tsx`

**调用方式**:
```typescript
// 1. 判断是否为冰岛行程
const isIceland = useIsIcelandTrip(trip?.destination);

// 2. 使用 Hook（自动获取）
const icelandInfo = useIcelandInfo({
  autoFetch: isIceland && open, // 仅在冰岛行程且抽屉打开时自动获取
  refreshInterval: 0, // 不自动刷新，手动刷新
});

// 3. 显示数据
{icelandInfo.safety.data && icelandInfo.safety.data.alerts.length > 0 && (
  <Card>
    <CardContent>
      {icelandInfo.safety.data.alerts.map(alert => (
        <div key={alert.id}>{alert.title}</div>
      ))}
    </CardContent>
  </Card>
)}

// 4. 手动刷新按钮
<Button onClick={() => {
  icelandInfo.fetchAll({
    safety: { region: 'highlands' },
    roadConditions: {},
  });
}}>
  刷新冰岛信息
</Button>
```

**特点**:
- ✅ 自动检测冰岛行程
- ✅ 抽屉打开时自动获取
- ✅ 提供手动刷新按钮
- ✅ 显示安全警报和F路路况

---

### 场景2: PlanningWorkbenchTab（规划工作台）

**位置**: `src/pages/plan-studio/PlanningWorkbenchTab.tsx`

**调用方式**:
```typescript
import { useIcelandInfo, useIsIcelandTrip } from '@/hooks';

export default function PlanningWorkbenchTab({ tripId }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  
  // 判断是否为冰岛行程
  const isIceland = useIsIcelandTrip(trip?.destination);
  
  // 使用 Hook（自动获取）
  const icelandInfo = useIcelandInfo({
    autoFetch: isIceland, // 自动获取
    refreshInterval: 0,
  });
  
  // 在 useEffect 中触发获取
  useEffect(() => {
    if (isIceland && trip) {
      icelandInfo.fetchAll({
        weather: { region: 'centralhighlands' },
        safety: { region: 'highlands' },
        roadConditions: {},
      });
    }
  }, [isIceland, trip]);
  
  // 使用数据
  return (
    <div>
      {icelandInfo.weather.data && (
        <div>当前温度: {icelandInfo.weather.data.current.temperature}°C</div>
      )}
    </div>
  );
}
```

---

## 🎯 Hook API 详解

### `useIcelandInfo(options)`

**参数**:
```typescript
interface UseIcelandInfoOptions {
  autoFetch?: boolean;        // 是否自动获取（默认 false）
  refreshInterval?: number;   // 自动刷新间隔（毫秒，默认 0 表示不自动刷新）
}
```

**返回值**:
```typescript
interface UseIcelandInfoReturn {
  // 天气相关
  weather: {
    data: WeatherData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetWeatherParams) => Promise<WeatherData | null>;
    refetch: () => Promise<WeatherData | null>;
  };
  
  // 安全信息相关
  safety: {
    data: SafetyData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetSafetyParams) => Promise<SafetyData | null>;
    refetch: () => Promise<SafetyData | null>;
  };
  
  // F路路况相关
  roadConditions: {
    data: RoadConditionsData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetRoadConditionsParams) => Promise<RoadConditionsData | null>;
    refetch: () => Promise<RoadConditionsData | null>;
  };
  
  // 综合方法：一次性获取所有信息
  fetchAll: (params?: {
    weather?: GetWeatherParams;
    safety?: GetSafetyParams;
    roadConditions?: GetRoadConditionsParams;
  }) => Promise<void>;
  
  // 重置所有状态
  reset: () => void;
}
```

---

### `useIsIcelandTrip(destination)`

**参数**:
```typescript
destination?: string | null; // 目的地代码，如 "IS" 或 "IS, Reykjavik"
```

**返回值**:
```typescript
boolean; // 是否为冰岛行程
```

**判断逻辑**:
- 国家代码为 `IS`
- 包含 `iceland` 或 `冰岛` 关键词

---

## 💡 使用建议

### 1. 自动获取 vs 手动获取

**自动获取**（推荐）:
```typescript
const icelandInfo = useIcelandInfo({
  autoFetch: isIceland && open, // 条件触发
  refreshInterval: 0,
});
```

**手动获取**:
```typescript
const icelandInfo = useIcelandInfo({
  autoFetch: false, // 不自动获取
});

// 在需要时手动调用
useEffect(() => {
  if (needData) {
    icelandInfo.fetchAll({
      safety: { region: 'highlands' },
    });
  }
}, [needData]);
```

### 2. 一次性获取所有数据

```typescript
// 使用 fetchAll 方法
icelandInfo.fetchAll({
  weather: { region: 'centralhighlands' },
  safety: { region: 'highlands' },
  roadConditions: { fRoads: 'F208,F26' },
});
```

### 3. 单独获取某个数据源

```typescript
// 只获取天气
await icelandInfo.weather.fetch({ region: 'centralhighlands' });

// 只获取安全信息
await icelandInfo.safety.fetch({ region: 'highlands' });

// 只获取F路路况
await icelandInfo.roadConditions.fetch({ fRoads: 'F208' });
```

### 4. 错误处理

```typescript
const icelandInfo = useIcelandInfo();

// 检查错误状态
if (icelandInfo.weather.error) {
  console.error('天气数据获取失败:', icelandInfo.weather.error);
}

// 在 UI 中显示错误
{icelandInfo.weather.error && (
  <div className="text-red-500">
    天气数据加载失败: {icelandInfo.weather.error}
  </div>
)}
```

### 5. 加载状态

```typescript
// 检查加载状态
{icelandInfo.weather.loading && (
  <div>加载天气数据中...</div>
)}

// 禁用按钮
<Button 
  disabled={icelandInfo.safety.loading || icelandInfo.roadConditions.loading}
  onClick={() => icelandInfo.fetchAll()}
>
  刷新
</Button>
```

---

## 🔄 数据流图

```
用户打开准备度抽屉
    ↓
useIsIcelandTrip() 检测是否为冰岛行程
    ↓ (是)
useIcelandInfo({ autoFetch: true }) Hook 初始化
    ↓
自动调用 icelandInfoApi.getWeather()
自动调用 icelandInfoApi.getSafety()
自动调用 icelandInfoApi.getRoadConditions()
    ↓
数据返回，更新 Hook 状态
    ↓
UI 显示安全警报和F路路况
    ↓
用户点击"刷新冰岛信息"按钮
    ↓
调用 icelandInfo.fetchAll()
    ↓
重新获取所有数据
```

---

## 📝 完整示例

```typescript
import { useIcelandInfo, useIsIcelandTrip } from '@/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Shield, Route, Cloud, RefreshCw } from 'lucide-react';

function IcelandInfoSection({ trip }) {
  const isIceland = useIsIcelandTrip(trip?.destination);
  const icelandInfo = useIcelandInfo({
    autoFetch: isIceland,
    refreshInterval: 0,
  });

  if (!isIceland) {
    return null; // 非冰岛行程，不显示
  }

  const handleRefresh = () => {
    icelandInfo.fetchAll({
      weather: { region: 'centralhighlands' },
      safety: { region: 'highlands' },
      roadConditions: {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>冰岛官方信息源</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={
            icelandInfo.weather.loading ||
            icelandInfo.safety.loading ||
            icelandInfo.roadConditions.loading
          }
        >
          {(icelandInfo.weather.loading ||
            icelandInfo.safety.loading ||
            icelandInfo.roadConditions.loading) ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </>
          )}
        </Button>
      </div>

      {/* 天气信息 */}
      {icelandInfo.weather.loading && (
        <div className="flex items-center gap-2">
          <Spinner className="h-4 w-4" />
          <span>加载天气数据...</span>
        </div>
      )}
      {icelandInfo.weather.error && (
        <div className="text-red-500">错误: {icelandInfo.weather.error}</div>
      )}
      {icelandInfo.weather.data && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              <div>
                <div className="font-medium">当前温度</div>
                <div>{icelandInfo.weather.data.current.temperature}°C</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 安全警报 */}
      {icelandInfo.safety.data && icelandInfo.safety.data.alerts.length > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium mb-2">安全警报</div>
                {icelandInfo.safety.data.alerts.map(alert => (
                  <div key={alert.id} className="mb-1">
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                    <span className="ml-2">{alert.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* F路路况 */}
      {icelandInfo.roadConditions.data &&
        icelandInfo.roadConditions.data.fRoads.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-start gap-2">
                <Route className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium mb-2">F路路况</div>
                  {icelandInfo.roadConditions.data.fRoads.map(road => (
                    <div key={road.id} className="mb-1">
                      <Badge>{road.fRoadNumber}</Badge>
                      <span className="ml-2">
                        {road.status === 'open' ? '开放' : '封闭'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
```

---

## 🔗 相关文件

- **API 客户端**: `src/api/iceland-info.ts`
- **React Hook**: `src/hooks/useIcelandInfo.ts`
- **类型定义**: `src/types/iceland-info.ts`
- **使用示例**: `src/components/readiness/ReadinessDrawer.tsx`

---

## ⚠️ 注意事项

1. **缓存策略**: 后端接口支持缓存，天气数据缓存1小时，安全信息缓存30分钟，路况信息缓存15分钟
2. **错误处理**: API 可能返回模拟数据（标记为 `mock`），如果官方 API 不可用
3. **自动获取**: 建议仅在确认是冰岛行程时启用 `autoFetch`，避免不必要的 API 调用
4. **性能优化**: 使用 `refreshInterval` 时要谨慎，避免过于频繁的刷新
