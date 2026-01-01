import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ElevationPoint, ElevationEvent } from '@/types/trail';

interface ElevationProfileProps {
  elevationPoints: ElevationPoint[];
  events?: ElevationEvent[];
  totalDistanceKm: number;
  maxElevationM: number;
  onPointHover?: (point: ElevationPoint | null) => void;
  className?: string;
}

export function ElevationProfile({
  elevationPoints,
  events = [],
  totalDistanceKm,
  maxElevationM,
  onPointHover,
  className,
}: ElevationProfileProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ElevationPoint | null>(null);

  // 如果没有数据，显示占位符
  if (!elevationPoints || elevationPoints.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>海拔剖面</CardTitle>
          <CardDescription>交互式海拔剖面图</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>暂无海拔数据</p>
              <p className="text-xs mt-1">拖动显示对应路段坡度与风险</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算路径点用于 SVG
  const pathPoints = elevationPoints.map((point, index) => {
    const x = (point.distanceKm / totalDistanceKm) * 100;
    const y = 100 - (point.elevationM / maxElevationM) * 100;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  });

  const pathD = pathPoints.join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const distanceKm = (x / 100) * totalDistanceKm;

    // 找到最近的点
    const closestPoint = elevationPoints.reduce((prev, curr) => {
      const prevDist = Math.abs(prev.distanceKm - distanceKm);
      const currDist = Math.abs(curr.distanceKm - distanceKm);
      return currDist < prevDist ? curr : prev;
    });

    setHoveredPoint(closestPoint);
    onPointHover?.(closestPoint);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    onPointHover?.(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>海拔剖面</CardTitle>
        <CardDescription>
          {hoveredPoint
            ? `${hoveredPoint.distanceKm.toFixed(1)} km · ${hoveredPoint.elevationM} m`
            : '拖动显示对应路段坡度与风险'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* 网格线 */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1" opacity="0.2" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* 海拔曲线 */}
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary"
            />

            {/* 填充区域 */}
            <path
              d={`${pathD} L 100 100 L 0 100 Z`}
              fill="currentColor"
              opacity="0.1"
              className="text-primary"
            />

            {/* 事件标记 */}
            {events.map((event) => {
              const x = (event.distanceKm / totalDistanceKm) * 100;
              const y = 100 - (event.elevationM / maxElevationM) * 100;
              const color =
                event.impact === 'negative'
                  ? 'red'
                  : event.impact === 'positive'
                  ? 'green'
                  : 'gray';

              return (
                <circle
                  key={event.id}
                  cx={x}
                  cy={y}
                  r="1"
                  fill={color}
                  stroke="white"
                  strokeWidth="0.3"
                  className="cursor-pointer"
                  title={event.description}
                />
              );
            })}

            {/* 悬停指示器 */}
            {hoveredPoint && (
              <>
                <line
                  x1={(hoveredPoint.distanceKm / totalDistanceKm) * 100}
                  y1="0"
                  x2={(hoveredPoint.distanceKm / totalDistanceKm) * 100}
                  y2="100"
                  stroke="currentColor"
                  strokeWidth="0.3"
                  strokeDasharray="1,1"
                  className="text-primary"
                />
                <circle
                  cx={(hoveredPoint.distanceKm / totalDistanceKm) * 100}
                  cy={100 - (hoveredPoint.elevationM / maxElevationM) * 100}
                  r="1.5"
                  fill="currentColor"
                  className="text-primary"
                />
              </>
            )}
          </svg>

          {/* 标签 */}
          <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
            距离 (km)
          </div>
          <div className="absolute top-2 right-2 text-xs text-muted-foreground">
            海拔 (m)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

