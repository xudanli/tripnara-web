/**
 * 天气相关类型定义
 */

// ==================== 基础类型 ====================

/**
 * 天气状况类型
 */
export type WeatherCondition = 
  | 'sunny'      // 晴天
  | 'cloudy'     // 多云
  | 'rainy'      // 雨天
  | 'snowy'      // 雪天
  | 'stormy'     // 暴风雨
  | 'foggy'      // 雾天
  | 'hazy'       // 雾霾
  | 'windy';     // 大风

/**
 * 天气警告类型
 */
export type WeatherAlertType = 
  | 'wind'       // 强风警告
  | 'visibility' // 能见度警告
  | 'cold'       // 低温警告
  | 'heat';      // 高温警告

/**
 * 警告严重程度
 */
export type WeatherAlertSeverity = 
  | 'info'       // 信息
  | 'warning'    // 警告
  | 'critical';  // 严重

/**
 * 数据源标识
 */
export type WeatherSource = 
  | 'apis.is'      // 冰岛官方开放数据平台
  | 'weatherapi'   // WeatherAPI.com
  | 'openweather'; // OpenWeather

// ==================== 请求参数 ====================

/**
 * 获取当前天气请求参数
 */
export interface GetCurrentWeatherParams {
  /** 纬度（-90 到 90） */
  lat: number;
  /** 经度（-180 到 180） */
  lng: number;
  /** 是否包含详细风速信息（冰岛特定） */
  includeWindDetails?: boolean;
  /** 是否包含极光信息（冰岛特定） */
  includeAuroraInfo?: boolean;
}

// ==================== 响应类型 ====================

/**
 * 天气警告
 */
export interface WeatherAlert {
  /** 警告类型 */
  type: WeatherAlertType;
  /** 严重程度 */
  severity: WeatherAlertSeverity;
  /** 警告标题 */
  title: string;
  /** 警告描述 */
  description: string;
  /** 生效时间（ISO 8601） */
  effectiveTime: string;
}

/**
 * 天气元数据（数据源特定）
 */
export interface WeatherMetadata {
  /** 观测站名称（冰岛） */
  stationName?: string;
  /** 观测站 ID（冰岛） */
  stationId?: string;
  /** 最大阵风速度（米/秒）- 冰岛特定 */
  windGust?: number;
  /** 最大风速（米/秒）- 冰岛特定 */
  maxWindSpeed?: number;
  /** 气压（hPa） */
  pressure?: number;
  /** 云层覆盖（百分比） */
  cloudCover?: number;
  /** 露点温度（摄氏度） */
  dewPoint?: number;
  /** 降水量（毫米） */
  precipitation?: number;
  /** WeatherAPI.com 位置信息 */
  weatherapiLocation?: {
    name: string;
    region: string;
    country: string;
  };
  /** 极光信息（冰岛特定） */
  auroraInfo?: {
    /** 极光可见性（0-10） */
    visibility: number;
    /** 极光活动强度 */
    activity: string;
  };
  /** 其他数据源特定的元数据 */
  [key: string]: any;
}

/**
 * 当前天气数据
 */
export interface CurrentWeather {
  /** 温度（摄氏度） */
  temperature: number;
  /** 体感温度（摄氏度，可选）- 考虑风速、湿度等因素后的实际感受温度 */
  feelsLikeTemperature?: number;
  /** 天气状况 */
  condition: WeatherCondition;
  /** 风速（米/秒） */
  windSpeed: number;
  /** 风向（度，0-360，0=北，90=东，180=南，270=西） */
  windDirection: number;
  /** 湿度（百分比，0-100） */
  humidity: number;
  /** 能见度（米） */
  visibility: number;
  /** 天气警告列表 */
  alerts: WeatherAlert[];
  /** 数据最后更新时间（ISO 8601） */
  lastUpdated: string;
  /** 数据源标识 */
  source: WeatherSource;
  /** 额外元数据（数据源特定） */
  metadata?: WeatherMetadata;
}

/**
 * 获取当前天气响应
 */
export interface GetCurrentWeatherResponse {
  success: true;
  data: CurrentWeather;
  message?: string;
}

/**
 * API 错误响应
 */
export interface WeatherErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
    message: string;
  };
}
