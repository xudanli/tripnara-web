/**
 * 冰岛信息源 API 类型定义
 * 
 * 本模块提供冰岛官方信息源的API接口类型定义，包括：
 * - vedur.is - 冰岛气象局天气预报
 * - safetravel.is - 冰岛旅行安全信息
 * - road.is - 冰岛道路管理局F路路况
 */

/**
 * 高地区域枚举
 */
export type HighlandRegion = 'centralhighlands' | 'southhighlands' | 'northhighlands';

/**
 * 天气条件枚举
 */
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy';

/**
 * 警报类型枚举
 */
export type AlertType = 'weather' | 'road' | 'travel' | 'general';

/**
 * 警报严重程度枚举
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * F路状态枚举
 */
export type FRoadStatus = 'open' | 'closed' | 'caution' | 'impassable';

/**
 * F路路况枚举
 */
export type FRoadCondition = 'dry' | 'wet' | 'icy' | 'snowy' | 'muddy';

/**
 * 旅行条件状态枚举
 */
export type TravelConditionStatus = 'green' | 'yellow' | 'red';

/**
 * 气象站信息
 */
export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
}

/**
 * 当前天气数据
 */
export interface CurrentWeather {
  datetime: string; // ISO 8601 格式
  temperature: number; // 摄氏度
  windSpeed: number; // m/s
  windDirection: number; // 0-360度
  windSpeedKmh: number; // km/h
  precipitation: number; // mm
  condition: WeatherCondition;
  visibility: number; // 米
}

/**
 * 天气预报数据
 */
export interface WeatherForecast extends CurrentWeather {
  // 继承 CurrentWeather 的所有字段
}

/**
 * 天气预报响应数据
 */
export interface WeatherData {
  station: WeatherStation;
  current: CurrentWeather;
  forecast: WeatherForecast[]; // 6天预报
  lastUpdated: string; // ISO 8601 格式
  source: 'vedur.is' | 'mock';
}

/**
 * 获取天气预报请求参数
 */
export interface GetWeatherParams {
  region?: HighlandRegion;
  lat?: number;
  lng?: number;
  includeWindDetails?: boolean;
}

/**
 * 安全警报信息
 */
export interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  effectiveTime: string; // ISO 8601 格式
  expiryTime?: string; // ISO 8601 格式，可选
  regions: string[];
  fRoads?: string[]; // 关联的F路编号
}

/**
 * 旅行条件信息
 */
export interface TravelCondition {
  region: string;
  roadStatus: FRoadStatus;
  weatherStatus: 'fair' | 'poor' | 'severe';
  overallStatus: TravelConditionStatus;
  description: string;
  lastUpdated: string; // ISO 8601 格式
}

/**
 * 安全信息响应数据
 */
export interface SafetyData {
  alerts: SafetyAlert[];
  travelConditions: TravelCondition[];
  lastUpdated: string; // ISO 8601 格式
}

/**
 * 获取安全信息请求参数
 */
export interface GetSafetyParams {
  region?: string;
  alertType?: AlertType;
}

/**
 * F路起点/终点坐标
 */
export interface FRoadPoint {
  lat: number;
  lng: number;
}

/**
 * F路信息
 */
export interface FRoad {
  id: string;
  name: string;
  fRoadNumber: string; // 例如 "F208"
  startPoint: FRoadPoint;
  endPoint: FRoadPoint;
  status: FRoadStatus;
  condition: FRoadCondition;
  isOpen: boolean;
  description: string;
  lastUpdated: string; // ISO 8601 格式
}

/**
 * F路路况响应数据
 */
export interface RoadConditionsData {
  fRoads: FRoad[];
  lastUpdated: string; // ISO 8601 格式
  source: 'road.is' | 'mock';
}

/**
 * 获取F路路况请求参数
 */
export interface GetRoadConditionsParams {
  fRoads?: string; // 多个F路编号用逗号分隔，例如 "F208,F26,F910"
  status?: FRoadStatus;
}
