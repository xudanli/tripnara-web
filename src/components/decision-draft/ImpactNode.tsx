/**
 * 影响节点组件
 * 显示影响的行程部分
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImpactNodeProps {
  impactId: string;
  title: string;
  description?: string;
  affectedParts: string[];
  selected?: boolean;
  onClick?: () => void;
}

export default function ImpactNode({
  impactId,
  title,
  description,
  affectedParts,
  selected = false,
  onClick,
}: ImpactNodeProps) {
  return (
    <Card
      className={cn(
        'w-[180px] cursor-pointer transition-all hover:shadow-md border-orange-200 dark:border-orange-800',
        selected && 'ring-2 ring-orange-500'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <CardTitle className="text-sm font-semibold line-clamp-2">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* 描述 */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* 受影响部分 */}
        {affectedParts.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">受影响部分:</span>
            <div className="flex flex-wrap gap-1">
              {affectedParts.slice(0, 3).map((part, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {part}
                </Badge>
              ))}
              {affectedParts.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{affectedParts.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
