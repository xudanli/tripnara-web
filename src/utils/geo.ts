/**
 * 地理定位工具
 */

export interface GeoPosition {
  lat: number;
  lng: number;
}

/**
 * 获取用户当前位置
 * @param options 定位选项
 * @returns 坐标 { lat, lng }
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }
    );
  });
}

/** 需要用户坐标才能搜索的提示词模式（找医院、找药店等） */
export const NEEDS_LOCATION_PROMPT_PATTERN = /找医院|找药店|hospital|pharmacy|最近的医院|最近的药店/i;
