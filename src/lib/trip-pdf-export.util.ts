/**
 * 行程 PDF 导出：Content-Disposition 文件名解析、blob 下载、Nest 错误体解析
 */

import axios from 'axios';

/** 从 Content-Disposition 取 filename*（优先）或 filename */
export function parseContentDispositionFilename(
  header: string | null | undefined,
): string | null {
  if (!header?.trim()) return null;

  const star = header.match(/filename\*=(?:UTF-8''|utf-8'')([^;\s]+)/i);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^["']|["']$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  const plain = header.match(/filename="([^"]+)"|filename=([^;\s]+)/i);
  const value = (plain?.[1] ?? plain?.[2])?.trim();
  return value || null;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'trip.pdf';
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

/** axios responseType=blob 时，Nest 错误体在 Blob 里，需手动解析 message */
export async function messageFromBlobHttpError(error: unknown): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : '导出失败';
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as { message?: string | string[] };
      const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      if (msg?.trim()) return msg.trim();
    } catch {
      /* fall through */
    }
  } else if (data && typeof data === 'object' && 'message' in data) {
    const msg = (data as { message?: string | string[] }).message;
    const resolved = Array.isArray(msg) ? msg.join(', ') : msg;
    if (resolved?.trim()) return resolved.trim();
  } else if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (status === 401) return '未认证或 token 无效';
  if (status === 403) return '无权导出该行程，需要为行程成员';
  if (status === 404) return '行程不存在';
  return error.message || '导出失败';
}

/** api_action.path → axios 相对 path（去掉前导 /api，避免与 baseURL 重复） */
export function normalizeTripExportApiPath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.startsWith('/api/')) p = p.slice(4);
  else if (p === '/api') p = '/';
  return p;
}
