import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将 ISO 8601 或 Date 转为 yyyy-MM-dd，供 <input type="date"> 使用。
 * 后端 Prisma Date 序列化为 ISO 字符串（如 2026-02-22T00:00:00.000Z），
 * 直接用于 value 会触发 "does not conform to the required format" 错误。
 * 若已是 yyyy-MM-dd 则原样返回，避免时区导致的日期偏移。
 */
export function toDateOnly(date: string | Date | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
