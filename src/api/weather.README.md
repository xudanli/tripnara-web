# 天气 API 使用文档

## 概述

天气 API 提供全球天气数据查询服务，支持冰岛（apis.is）、WeatherAPI.com 和 OpenWeather 多个数据源。

## 快速开始

### 1. 使用 API 客户端

```typescript
import { weatherApi } from '@/api/weather';

// 获取当前天气
const weather = await weatherApi.getCurrent({
  lat: 64.1466,
  lng: -21.9426,
  includeWindDetails: true, // 冰岛特定：包含详细风速信息
  includeAuroraInfo: false, // 冰岛特定：包含极光信息
});

console.log(weather.temperature); // 5.6
console.log(weather.condition); // 'cloudy'
console.log(weather.windSpeed); // 8
console.log(weather.source); // 'apis.is'
```

### 2. 使用 React Hook

```typescript
import { useWeather } from '@/hooks/useWeather';

function WeatherComponent() {
  const { data, loading, error, refetch } = useWeather({
    lat: 64.1466,
    lng: -21.9426,
    includeWindDetails: true,
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h3>当前天气</h3>
      <p>温度: {data.temperature}°C</p>
      <p>天气: {data.condition}</p>
      <p>风速: {data.windSpeed} m/s</p>
      <p>数据源: {data.source}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

### 3. 条件获取

```typescript
// 禁用自动获取，手动控制
const { data, refetch } = useWeather(
  { lat: 64.1466, lng: -21.9426 },
  { enabled: false }
);

// 只在需要时获取
useEffect(() => {
  if (shouldFetch) {
    refetch();
  }
}, [shouldFetch, refetch]);
```

### 4. 自定义刷新间隔

```typescript
// 每 10 分钟自动刷新一次
const { data } = useWeather(
  { lat: 64.1466, lng: -21.9426 },
  { refreshInterval: 10 * 60 * 1000 }
);
```

## API 参考

### weatherApi.getCurrent(params)

获取指定位置的当前天气数据。

**参数**:
- `lat` (number, 必填): 纬度（-90 到 90）
- `lng` (number, 必填): 经度（-180 到 180）
- `includeWindDetails` (boolean, 可选): 是否包含详细风速信息（冰岛特定）
- `includeAuroraInfo` (boolean, 可选): 是否包含极光信息（冰岛特定）

**返回**: `Promise<CurrentWeather>`

**示例**:
```typescript
const weather = await weatherApi.getCurrent({
  lat: 64.1466,
  lng: -21.9426,
  includeWindDetails: true,
});
```

### useWeather(params, options)

React Hook 用于获取天气数据。

**参数**:
- `params` (GetCurrentWeatherParams | null): 请求参数
- `options` (可选):
  - `enabled` (boolean): 是否启用自动获取（默认 true）
  - `refreshInterval` (number): 自动刷新间隔（毫秒，默认 5 分钟）

**返回**:
- `data` (CurrentWeather | null): 天气数据
- `loading` (boolean): 加载状态
- `error` (string | null): 错误信息
- `refetch` (function): 手动刷新函数

## 类型定义

### CurrentWeather

```typescript
interface CurrentWeather {
  temperature: number;        // 温度（摄氏度）
  condition: WeatherCondition; // 天气状况
  windSpeed: number;          // 风速（米/秒）
  windDirection: number;      // 风向（度，0-360）
  humidity: number;           // 湿度（百分比，0-100）
  visibility: number;         // 能见度（米）
  alerts: WeatherAlert[];     // 天气警告列表
  lastUpdated: string;        // 数据最后更新时间（ISO 8601）
  source: WeatherSource;      // 数据源标识
  metadata?: WeatherMetadata;  // 额外元数据
}
```

### WeatherCondition

```typescript
type WeatherCondition = 
  | 'sunny'      // 晴天
  | 'cloudy'     // 多云
  | 'rainy'      // 雨天
  | 'snowy'      // 雪天
  | 'stormy'     // 暴风雨
  | 'foggy'      // 雾天
  | 'hazy'       // 雾霾
  | 'windy';     // 大风
```

### WeatherSource

```typescript
type WeatherSource = 
  | 'apis.is'      // 冰岛官方开放数据平台
  | 'weatherapi'   // WeatherAPI.com
  | 'openweather'; // OpenWeather
```

## 数据源说明

### 冰岛 (IS) - apis.is

- **优先级**: 最高（10）
- **特性**: 
  - 实时天气观测数据（每小时更新）
  - 详细风速和阵风数据
  - 自动选择最近的观测站
  - 自动生成天气警告

**示例**:
```typescript
const weather = await weatherApi.getCurrent({
  lat: 64.1466,  // 雷克雅未克
  lng: -21.9426,
  includeWindDetails: true, // 获取阵风数据
});

console.log(weather.metadata?.windGust); // 18 m/s
console.log(weather.metadata?.stationName); // "Reykjavík"
```

### WeatherAPI.com

- **优先级**: 中等（50）
- **配置要求**: 需要在 `.env` 中设置 `WEATHERAPI_API_KEY`
- **特性**: 
  - 实时天气数据
  - 空气质量数据（AQI）
  - 自动生成天气警告

### OpenWeather（默认）

- **优先级**: 最低（100）
- **配置要求**: 需要在 `.env` 中设置 `OPENWEATHER_API_KEY`
- **特性**: 
  - 实时天气数据
  - 基础天气信息

## 错误处理

```typescript
try {
  const weather = await weatherApi.getCurrent({
    lat: 64.1466,
    lng: -21.9426,
  });
} catch (error) {
  if (error.message.includes('VALIDATION_ERROR')) {
    console.error('参数验证失败');
  } else if (error.message.includes('INTERNAL_ERROR')) {
    console.error('服务器内部错误');
  } else {
    console.error('获取天气数据失败:', error.message);
  }
}
```

## 注意事项

1. **API Key 配置**: 需要在后端 `.env` 文件中配置相应的 API Key
2. **数据源选择**: 系统会根据查询位置自动选择最合适的数据源
3. **刷新频率**: 建议不要过于频繁地刷新，避免超出 API 配额
4. **错误处理**: 始终处理可能的错误情况，提供友好的用户提示

## 相关文件

- 类型定义: `src/types/weather.ts`
- API 客户端: `src/api/weather.ts`
- React Hook: `src/hooks/useWeather.ts`
