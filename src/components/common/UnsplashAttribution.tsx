/**
 * Unsplash 图片归属组件
 * 
 * ⚠️ 重要：Unsplash API 使用条款要求必须展示归属信息
 * https://unsplash.com/license
 * 
 * 使用示例：
 * ```tsx
 * <UnsplashAttribution 
 *   attribution={photo.attribution} 
 *   size="sm" 
 * />
 * ```
 */

import { cn } from '@/lib/utils';
import type { PlacePhotoAttribution } from '@/types/place-image';

interface UnsplashAttributionProps {
  /** 归属信息 */
  attribution: PlacePhotoAttribution;
  /** 尺寸：sm 用于卡片悬浮，md 用于详情页 */
  size?: 'sm' | 'md';
  /** 额外的 CSS 类名 */
  className?: string;
  /** 是否显示完整格式（包含 "Photo by"） */
  showFullFormat?: boolean;
}

/**
 * Unsplash 图片归属信息展示组件
 * 
 * 符合 Unsplash API 使用条款，必须在图片旁边展示：
 * - 摄影师姓名（链接到其 Unsplash 主页）
 * - Unsplash 链接
 */
export function UnsplashAttribution({
  attribution,
  size = 'sm',
  className,
  showFullFormat = true,
}: UnsplashAttributionProps) {
  const linkClass = cn(
    'hover:underline transition-colors',
    size === 'sm' ? 'hover:text-white' : 'hover:text-primary'
  );

  if (!attribution) {
    return null;
  }

  return (
    <div
      className={cn(
        'text-muted-foreground',
        size === 'sm' && 'text-[10px] leading-tight',
        size === 'md' && 'text-xs',
        className
      )}
    >
      {showFullFormat ? (
        <>
          Photo by{' '}
          <a
            href={attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {attribution.photographerName}
          </a>
          {' / '}
          <a
            href={attribution.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            Unsplash
          </a>
        </>
      ) : (
        <>
          <a
            href={attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {attribution.photographerName}
          </a>
          {' · '}
          <a
            href={attribution.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            Unsplash
          </a>
        </>
      )}
    </div>
  );
}

/**
 * 图片容器组件（带归属信息悬浮显示）
 * 
 * 使用示例：
 * ```tsx
 * <PlaceImageWithAttribution
 *   src={photo.urls.thumb}
 *   alt={placeName}
 *   color={photo.color}
 *   attribution={photo.attribution}
 * />
 * ```
 */
interface PlaceImageWithAttributionProps {
  /** 图片 URL */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 占位背景色 */
  color?: string;
  /** 归属信息 */
  attribution: PlacePhotoAttribution;
  /** 容器类名 */
  className?: string;
  /** 图片类名 */
  imgClassName?: string;
  /** 加载失败时的回调 */
  onError?: () => void;
}

export function PlaceImageWithAttribution({
  src,
  alt,
  color,
  attribution,
  className,
  imgClassName,
  onError,
}: PlaceImageWithAttributionProps) {
  return (
    <div className={cn('relative overflow-hidden group', className)}>
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', imgClassName)}
        style={{ backgroundColor: color }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          onError?.();
        }}
        loading="lazy"
      />
      {/* 悬浮显示归属信息 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-gradient-to-t from-black/70 to-transparent',
          'px-1.5 py-1',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200'
        )}
      >
        <UnsplashAttribution
          attribution={attribution}
          size="sm"
          className="text-white/90"
          showFullFormat={false}
        />
      </div>
    </div>
  );
}

export default UnsplashAttribution;
