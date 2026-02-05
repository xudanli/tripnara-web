/**
 * 空状态图片组件
 * 
 * 用于显示不同场景的空状态占位图
 */

import { cn } from '@/lib/utils';

// 导入空状态图片（分别导入每个图片）
import noRecommendedPlacesImage from '@/assets/images/empty-states/no-recommended-places.png';
import noArrangementsImage from '@/assets/images/empty-states/no-arrangements.png';
import noItineraryItemsImage from '@/assets/images/empty-states/no-itinerary-items.png';
import noTripAddedImage from '@/assets/images/empty-states/no-trip-added.png';

export type EmptyStateType = 
  | 'no-recommended-places'    // 暂无推荐地点
  | 'no-arrangements'           // 该日暂无安排
  | 'no-itinerary-items'        // 暂无行程项
  | 'no-trip-added';            // 你还没有添加任何行程哦~

interface EmptyStateImageProps {
  type: EmptyStateType;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * 空状态图片组件
 * 
 * 根据类型显示对应的空状态图片
 */
export function EmptyStateImage({ 
  type, 
  className,
  width = 200,
  height = 200,
}: EmptyStateImageProps) {
  // 根据类型选择对应的图片
  const getImageSrc = () => {
    switch (type) {
      case 'no-recommended-places':
        return noRecommendedPlacesImage;
      case 'no-arrangements':
        return noArrangementsImage;
      case 'no-itinerary-items':
        return noItineraryItemsImage;
      case 'no-trip-added':
        return noTripAddedImage;
      default:
        return noTripAddedImage;
    }
  };

  return (
    <img
      src={getImageSrc()}
      alt={getEmptyStateLabel(type)}
      className={cn('inline-block object-contain', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      role="img"
    />
  );
}

/**
 * 获取空状态的标签文本
 */
function getEmptyStateLabel(type: EmptyStateType): string {
  const labels: Record<EmptyStateType, string> = {
    'no-recommended-places': '暂无推荐地点',
    'no-arrangements': '该日暂无安排',
    'no-itinerary-items': '暂无行程项',
    'no-trip-added': '你还没有添加任何行程哦~',
  };
  return labels[type];
}

/**
 * 空状态卡片组件（带图片和文本）
 */
interface EmptyStateCardProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export function EmptyStateCard({
  type,
  title,
  description,
  action,
  className,
  imageWidth = 200,
  imageHeight = 200,
}: EmptyStateCardProps) {
  const defaultTitle = getEmptyStateLabel(type);
  
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <EmptyStateImage 
        type={type} 
        width={imageWidth}
        height={imageHeight}
        className="mb-4"
      />
      {title && (
        <h3 className="text-lg font-medium mb-2">{title || defaultTitle}</h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
