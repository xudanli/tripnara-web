import type { GuideSource } from '@/types/guide-import';

export type GuidePlatform =
  | 'xiaohongshu'
  | 'wechat'
  | 'bilibili'
  | 'zhihu'
  | 'blog'
  | 'file'
  | 'screenshot'
  | 'text'
  | 'inspiration'
  | 'unknown';

export const PLATFORM_LABELS: Record<GuidePlatform, string> = {
  xiaohongshu: '小红书',
  wechat: '公众号',
  bilibili: 'B站',
  zhihu: '知乎',
  blog: '博客',
  file: '文件',
  screenshot: '截图',
  text: '文字',
  inspiration: '灵感',
  unknown: '攻略',
};

export function detectGuidePlatform(source: GuideSource): GuidePlatform {
  if (source.type === 'screenshot') return 'screenshot';
  if (source.type === 'file') return 'file';
  if (source.type === 'text') return 'text';
  if (source.type === 'inspiration') return 'inspiration';
  const url = source.url?.toLowerCase() ?? '';
  if (url.includes('xiaohongshu') || url.includes('xhslink')) return 'xiaohongshu';
  if (url.includes('weixin') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('bilibili')) return 'bilibili';
  if (url.includes('zhihu')) return 'zhihu';
  if (url) return 'blog';
  return 'unknown';
}

export function getGuideDisplayTitle(source: GuideSource): string {
  if (source.title) return source.title;
  if (source.type === 'inspiration' && source.inspirationText) {
    return source.inspirationText.length > 36
      ? `${source.inspirationText.slice(0, 36)}…`
      : source.inspirationText;
  }
  if (source.rawText) {
    const line = source.rawText.split('\n').find((l) => l.trim())?.trim();
    if (line) return line.length > 40 ? `${line.slice(0, 40)}…` : line;
  }
  if (source.url) {
    try {
      const host = new URL(source.url).hostname.replace('www.', '');
      return `来自 ${host} 的攻略`;
    } catch {
      return '链接攻略';
    }
  }
  return '未命名攻略';
}

export function getGuideDisplaySubtitle(source: GuideSource): string | undefined {
  const platform = detectGuidePlatform(source);
  const label = PLATFORM_LABELS[platform];
  if (source.type === 'link') return label;
  if (source.type === 'text' && source.rawText) {
    return `${label} · 约 ${source.rawText.length} 字`;
  }
  return label;
}

/** 导入前预估提取量（演示用，解析后以真实结果为准） */
export function estimateExtractionFromSources(sources: GuideSource[]) {
  let charCount = 0;
  for (const s of sources) {
    charCount += (s.rawText?.length ?? 0) + (s.inspirationText?.length ?? 0) + (s.url ? 800 : 0);
  }
  const factor = Math.max(sources.length, 1);
  return {
    places: Math.min(36, Math.round(6 * factor + charCount / 500)),
    restaurants: Math.min(28, Math.round(3 * factor + charCount / 800)),
    accommodations: Math.min(12, Math.round(2 * factor + charCount / 1200)),
    risks: Math.min(8, Math.round(1 * factor + charCount / 2000)),
  };
}
