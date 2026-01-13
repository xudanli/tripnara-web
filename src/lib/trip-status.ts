/**
 * 行程状态系统工具函数
 * 
 * 统一管理 TripNARA 的行程状态：
 * - PLANNING: 规划中
 * - IN_PROGRESS: 进行中
 * - COMPLETED: 已完成
 * - CANCELLED: 已取消
 */

import type { TripStatus } from '@/types/trip';

/**
 * 获取行程状态样式类名（使用设计 Token）
 * 
 * @param status 行程状态
 * @returns Tailwind 类名字符串
 */
export function getTripStatusClasses(status: TripStatus): string {
  switch (status) {
    case 'PLANNING':
      return 'bg-trip-status-planning text-trip-status-planning-foreground border-trip-status-planning-border';
    case 'IN_PROGRESS':
      return 'bg-trip-status-progress text-trip-status-progress-foreground border-trip-status-progress-border';
    case 'COMPLETED':
      return 'bg-trip-status-completed text-trip-status-completed-foreground border-trip-status-completed-border';
    case 'CANCELLED':
      return 'bg-trip-status-cancelled text-trip-status-cancelled-foreground border-trip-status-cancelled-border';
  }
}

/**
 * 获取行程状态标签文本（中文）
 * 
 * @param status 行程状态
 * @returns 状态标签文本
 */
export function getTripStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'PLANNING':
      return '规划中';
    case 'IN_PROGRESS':
      return '进行中';
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
  }
}

/**
 * 获取行程状态标签文本（英文）
 * 
 * @param status 行程状态
 * @returns 状态标签文本（英文）
 */
export function getTripStatusLabelEn(status: TripStatus): string {
  switch (status) {
    case 'PLANNING':
      return 'Planning';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
  }
}
