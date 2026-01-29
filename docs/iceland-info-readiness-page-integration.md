# 冰岛官方信息源在 ReadinessPage 的集成方案

**日期**：2026-01-29  
**状态**：待集成

---

## 📋 当前状态

### ✅ 已集成的位置

1. **PlanningWorkbenchTab（规划工作台）** ✅
   - 已集成冰岛官方信息源接口
   - 自动获取天气、安全、路况信息
   - 显示在规划工作台页面

### ❌ 未集成的位置

1. **ReadinessPage（准备度页面）** ❌
   - 目前**没有**调用冰岛官方信息源接口
   - 只显示准备度检查结果（来自 `pack.is.iceland` 能力包）
   - 没有实时天气、安全、路况信息

2. **ReadinessDrawer（准备度抽屉）** ❌
   - 之前有集成，但重构后移除了
   - 现在只显示准备度检查结果

---

## 🎯 集成方案

### 方案 1：在 ReadinessPage 中添加冰岛信息源卡片（推荐）

**位置**：在证据标签页（`evidence` tab）中，在证据列表之前显示

**实现步骤**：

1. **导入必要的 Hook 和工具**：
```typescript
import { useIcelandInfo, useIsIcelandTrip } from '@/hooks';
import { inferIcelandInfoParams } from '@/utils/iceland-info-inference';
```

2. **添加状态管理**：
```typescript
// 在 ReadinessPage 组件中
const isIceland = useIsIcelandTrip(trip?.destination);
const icelandInfoParams = inferIcelandInfoParams(trip);
const icelandInfo = useIcelandInfo({
  autoFetch: false,
  refreshInterval: 0,
});

// 自动获取冰岛信息（延迟执行）
useEffect(() => {
  if (isIceland && trip && icelandInfoParams) {
    const timer = setTimeout(() => {
      icelandInfo.fetchAll(icelandInfoParams);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [isIceland, trip?.id]);
```

3. **添加 UI 组件**：
在证据标签页中，在 `EvidenceCompletenessCard` 之前添加：

```tsx
{/* 🆕 冰岛官方信息源（仅冰岛行程） */}
{isIceland && trip && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">冰岛官方信息源</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = inferIcelandInfoParams(trip);
            icelandInfo.fetchAll(params);
          }}
          disabled={
            icelandInfo.weather.loading ||
            icelandInfo.safety.loading ||
            icelandInfo.roadConditions.loading
          }
          className="h-8 text-xs"
        >
          {(icelandInfo.weather.loading ||
            icelandInfo.safety.loading ||
            icelandInfo.roadConditions.loading) ? (
            <>
              <Spinner className="mr-2 h-3 w-3" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              刷新
            </>
          )}
        </Button>
      </div>
      <CardDescription className="text-xs">
        实时获取冰岛官方天气、安全和路况信息
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* 天气信息 */}
      {icelandInfo.weather.loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          <span>加载天气数据...</span>
        </div>
      )}
      {icelandInfo.weather.error && (
        <div className="text-sm text-red-500">
          天气数据加载失败: {icelandInfo.weather.error}
        </div>
      )}
      {icelandInfo.weather.data && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
          <Cloud className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700 mb-1">高地天气预报</div>
            <div className="text-xs text-gray-600">
              {icelandInfo.weather.data.station.name}: {Math.round(icelandInfo.weather.data.current.temperature)}°C
              {icelandInfo.weather.data.current.windSpeedKmh && (
                <span className="ml-2">
                  ，风速 {Math.round(icelandInfo.weather.data.current.windSpeedKmh)} km/h
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 安全警报 */}
      {icelandInfo.safety.loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          <span>加载安全信息...</span>
        </div>
      )}
      {icelandInfo.safety.error && (
        <div className="text-sm text-red-500">
          安全信息加载失败: {icelandInfo.safety.error}
        </div>
      )}
      {icelandInfo.safety.data && icelandInfo.safety.data.alerts.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
          <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700 mb-1">安全警报</div>
            <div className="space-y-1">
              {icelandInfo.safety.data.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-xs">
                  <Badge
                    variant={
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs mr-1"
                  >
                    {alert.severity === 'critical'
                      ? '严重'
                      : alert.severity === 'high'
                      ? '高'
                      : '中'}
                  </Badge>
                  {alert.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* F路路况 */}
      {icelandInfo.roadConditions.loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          <span>加载路况信息...</span>
        </div>
      )}
      {icelandInfo.roadConditions.error && (
        <div className="text-sm text-red-500">
          路况信息加载失败: {icelandInfo.roadConditions.error}
        </div>
      )}
      {icelandInfo.roadConditions.data && icelandInfo.roadConditions.data.roads.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
          <Route className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700 mb-1">F路路况</div>
            <div className="space-y-1">
              {icelandInfo.roadConditions.data.roads.slice(0, 3).map((road) => (
                <div key={road.number} className="text-xs">
                  <Badge
                    variant={
                      road.status === 'closed' || road.status === 'impassable'
                        ? 'destructive'
                        : road.status === 'caution'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-xs mr-1"
                  >
                    {road.status === 'closed'
                      ? '封闭'
                      : road.status === 'impassable'
                      ? '不可通行'
                      : road.status === 'caution'
                      ? '谨慎'
                      : '开放'}
                  </Badge>
                  F{road.number}: {road.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

---

## 📊 接口调用详情

### 已实现的接口

1. **GET /iceland-info/weather**
   - **数据源**：vedur.is（冰岛气象局）
   - **用途**：获取高地天气预报
   - **调用位置**：`PlanningWorkbenchTab` ✅

2. **GET /iceland-info/safety**
   - **数据源**：safetravel.is（冰岛旅行安全信息）
   - **用途**：获取安全警报和旅行条件
   - **调用位置**：`PlanningWorkbenchTab` ✅

3. **GET /iceland-info/road-conditions**
   - **数据源**：road.is（冰岛道路管理局）
   - **用途**：获取F路路况和开放状态
   - **调用位置**：`PlanningWorkbenchTab` ✅

---

## 🔧 技术实现

### API 客户端层

**文件**：`src/api/iceland-info.ts`

```typescript
export const icelandInfoApi = {
  getWeather: async (params?: GetWeatherParams): Promise<WeatherData> => {
    const response = await apiClient.get<ApiResponseWrapper<WeatherData>>(
      '/iceland-info/weather',
      { params }
    );
    return handleResponse(response);
  },
  getSafety: async (params?: GetSafetyParams): Promise<SafetyData> => {
    const response = await apiClient.get<ApiResponseWrapper<SafetyData>>(
      '/iceland-info/safety',
      { params }
    );
    return handleResponse(response);
  },
  getRoadConditions: async (params?: GetRoadConditionsParams): Promise<RoadConditionsData> => {
    const response = await apiClient.get<ApiResponseWrapper<RoadConditionsData>>(
      '/iceland-info/road-conditions',
      { params }
    );
    return handleResponse(response);
  },
};
```

### React Hook 层

**文件**：`src/hooks/useIcelandInfo.ts`

```typescript
export function useIcelandInfo(options: {
  autoFetch?: boolean;
  refreshInterval?: number;
} = {}): UseIcelandInfoReturn {
  // 状态管理
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [roadConditionsData, setRoadConditionsData] = useState<RoadConditionsData | null>(null);
  
  // 获取方法
  const fetchWeather = useCallback(async (params?: GetWeatherParams) => {
    const data = await icelandInfoApi.getWeather(params);
    setWeatherData(data);
    return data;
  }, []);
  
  // ... 其他方法
  
  return {
    weather: { data: weatherData, loading: weatherLoading, error: weatherError, fetch: fetchWeather },
    safety: { data: safetyData, loading: safetyLoading, error: safetyError, fetch: fetchSafety },
    roadConditions: { data: roadConditionsData, loading: roadConditionsLoading, error: roadConditionsError, fetch: fetchRoadConditions },
    fetchAll: async (params) => {
      await Promise.all([
        fetchWeather(params.weather),
        fetchSafety(params.safety),
        fetchRoadConditions(params.roadConditions),
      ]);
    },
  };
}
```

### 参数推断工具

**文件**：`src/utils/iceland-info-inference.ts`

```typescript
export function inferIcelandInfoParams(trip: TripDetail | null): {
  weather?: GetWeatherParams;
  safety?: GetSafetyParams;
  roadConditions?: GetRoadConditionsParams;
} {
  // 从行程数据中推断参数
  // - 提取F路编号
  // - 推断高地区域
  // - 推断安全区域
  // ...
}
```

---

## ✅ 集成清单

### PlanningWorkbenchTab ✅

- [x] 导入 `useIcelandInfo` 和 `useIsIcelandTrip`
- [x] 导入 `inferIcelandInfoParams`
- [x] 添加状态管理
- [x] 添加自动获取逻辑（延迟2秒）
- [x] 添加 UI 显示（天气、安全、路况）
- [x] 添加手动刷新按钮

### ReadinessPage ❌

- [ ] 导入 `useIcelandInfo` 和 `useIsIcelandTrip`
- [ ] 导入 `inferIcelandInfoParams`
- [ ] 添加状态管理
- [ ] 添加自动获取逻辑
- [ ] 添加 UI 显示（在证据标签页）
- [ ] 添加手动刷新按钮

---

## 🎯 建议

**建议在 ReadinessPage 中添加冰岛官方信息源显示**，原因：

1. **用户需求**：用户在准备度页面查看行程准备情况时，需要实时了解冰岛的天气、安全、路况信息
2. **数据一致性**：准备度检查结果（来自 `pack.is.iceland`）和实时官方信息（来自 vedur.is、safetravel.is、road.is）可以相互补充
3. **用户体验**：用户不需要切换到规划工作台页面就能看到实时信息

---

## 📚 相关文档

- [冰岛信息源 API 接口对接状态报告](./iceland-info-api-integration-status.md)
- [冰岛官方信息源接口调用说明](./iceland-info-api-usage.md)

---

**最后更新**：2026-01-29  
**状态**：待集成到 ReadinessPage
