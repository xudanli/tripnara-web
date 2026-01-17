/**
 * 地点图片相关类型定义
 * 
 * 用于 Unsplash API 集成，提供地点高质量图片
 */

// ==================== 图片数据结构 ====================

/**
 * 图片 URL 集合（不同尺寸）
 */
export interface PlacePhotoUrls {
  /** 原始图片 URL */
  raw: string;
  /** 全尺寸图片 */
  full: string;
  /** 常规尺寸（1080px），推荐用于详情页 */
  regular: string;
  /** 小尺寸（400px），推荐用于卡片 */
  small: string;
  /** 缩略图（200px），推荐用于列表 */
  thumb: string;
}

/**
 * 摄影师信息
 */
export interface PlacePhotoUser {
  /** 摄影师姓名 */
  name: string;
  /** 摄影师用户名 */
  username: string;
  /** 摄影师主页链接 */
  link: string;
}

/**
 * 归属信息（Unsplash API 要求必须展示）
 */
export interface PlacePhotoAttribution {
  /** 摄影师姓名 */
  photographerName: string;
  /** 摄影师 Unsplash 主页 */
  photographerUrl: string;
  /** 图片在 Unsplash 的页面 */
  unsplashUrl: string;
}

/**
 * 地点图片完整信息
 */
export interface PlacePhoto {
  /** 图片唯一 ID */
  id: string;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 图片主色调（十六进制），可用于加载占位 */
  color: string;
  /** BlurHash 字符串，用于生成模糊占位图 */
  blurHash: string;
  /** 图片描述 */
  description?: string;
  /** 替代文本 */
  altDescription?: string;
  /** 不同尺寸的 URL */
  urls: PlacePhotoUrls;
  /** 摄影师信息 */
  user: PlacePhotoUser;
  /** 归属信息（必须展示） */
  attribution: PlacePhotoAttribution;
}

// ==================== API 请求/响应类型 ====================

/**
 * 单个地点图片请求
 */
export interface PlaceImageRequest {
  /** 地点 ID（可选，用于前端关联） */
  placeId?: string;
  /** 地点中文名称（必填） */
  placeName: string;
  /** 地点英文名称（推荐，提高国际地点匹配度） */
  placeNameEn?: string;
  /** 国家（可选，缩小搜索范围） */
  country?: string;
  /** 类别（可选，优化搜索结果） */
  category?: string;
}

/**
 * 批量获取图片请求体
 */
export interface BatchPlaceImagesRequest {
  places: PlaceImageRequest[];
}

/**
 * 单个地点图片结果
 */
export interface PlaceImageResult {
  /** 地点 ID */
  placeId?: string;
  /** 地点名称 */
  placeName: string;
  /** 图片数据（未找到时为 null） */
  photo: PlacePhoto | null;
  /** 是否来自缓存 */
  cached: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 批量获取图片响应统计
 */
export interface BatchPlaceImagesStats {
  /** 请求总数 */
  total: number;
  /** 成功找到图片的数量 */
  found: number;
  /** 缓存命中数量 */
  cached: number;
  /** 失败数量 */
  failed: number;
}

/**
 * 批量获取图片响应
 */
export interface BatchPlaceImagesResponse {
  /** 是否成功 */
  success: boolean;
  /** 结果列表 */
  results: PlaceImageResult[];
  /** 统计信息 */
  stats: BatchPlaceImagesStats;
  /** 处理耗时（毫秒） */
  processingTimeMs: number;
}

/**
 * 缓存统计响应
 */
export interface PlaceImagesCacheStats {
  /** 缓存条目总数 */
  totalEntries: number;
  /** 缓存命中次数 */
  hitCount: number;
  /** 缓存未命中次数 */
  missCount: number;
  /** 缓存命中率 */
  hitRate: number;
  /** 缓存大小（字节） */
  sizeBytes?: number;
  /** 最后更新时间 */
  lastUpdated?: string;
}
