import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverageGap {
  id: string;
  type: 'road' | 'poi' | 'transport';
  location: string;
  description: string;
}

interface CoverageMiniMapProps {
  gaps?: CoverageGap[];
  onGapClick?: (gapId: string) => void;
  className?: string;
}

export default function CoverageMiniMap({
  gaps = [],
  onGapClick,
  className,
}: CoverageMiniMapProps) {
  // 这是一个简化的地图视图，实际应该集成真实的地图组件
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        <div className="relative h-64 bg-muted flex items-center justify-center">
          {/* 简化的路线骨架图 */}
          <svg
            viewBox="0 0 400 200"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 背景网格 */}
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* 路线路径 */}
            <path
              d="M 50 150 Q 150 100 250 80 T 350 50"
              fill="none"
              stroke="#DC2626"
              strokeWidth="3"
              strokeDasharray="8 4"
            />

            {/* POI 点 */}
            <circle cx="50" cy="150" r="6" fill="#DC2626" />
            <circle cx="150" cy="100" r="6" fill="#DC2626" />
            <circle cx="250" cy="80" r="6" fill="#DC2626" />
            <circle cx="350" cy="50" r="6" fill="#DC2626" />

            {/* 缺口标注 */}
            {gaps.map((gap, index) => {
              const positions = [
                { x: 100, y: 120 },
                { x: 200, y: 90 },
                { x: 300, y: 65 },
              ];
              const pos = positions[index % positions.length];
              return (
                <g key={gap.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="8"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onClick={() => onGapClick?.(gap.id)}
                  />
                  <AlertCircle
                    x={pos.x}
                    y={pos.y}
                    className="h-4 w-4 text-red-600 cursor-pointer"
                    onClick={() => onGapClick?.(gap.id)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 缺口列表 */}
        {gaps.length > 0 && (
          <div className="p-4 border-t space-y-2">
            <div className="text-sm font-medium mb-2">覆盖缺口</div>
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer transition-colors"
                onClick={() => onGapClick?.(gap.id)}
              >
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{gap.location}</div>
                  <div className="text-xs text-muted-foreground">{gap.description}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {gap.type}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {gaps.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>所有路段和 POI 都有证据覆盖</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

