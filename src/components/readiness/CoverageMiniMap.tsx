import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import polyline from '@mapbox/polyline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CoverageMapResponse,
  CoverageMapPoi,
  CoverageMapSegment,
  CoverageGap,
  PoiCoverageStatus,
  SegmentCoverageStatus,
} from '@/api/readiness';
import { useTranslation } from 'react-i18next';

import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox Access Token - 从环境变量获取
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface CoverageMiniMapProps {
  data?: CoverageMapResponse | null;
  loading?: boolean;
  error?: string | null;
  onPoiClick?: (poi: CoverageMapPoi) => void;
  onSegmentClick?: (segment: CoverageMapSegment) => void;
  onGapClick?: (gap: CoverageGap) => void;
  className?: string;
  height?: number;
}

// POI 覆盖状态颜色
const POI_COLORS: Record<PoiCoverageStatus, string> = {
  covered: '#22c55e',   // 绿色
  partial: '#eab308',   // 黄色
  uncovered: '#ef4444', // 红色
};

// 路段覆盖状态颜色
const SEGMENT_COLORS: Record<SegmentCoverageStatus, string> = {
  covered: '#22c55e',   // 绿色
  warning: '#f97316',   // 橙色
  blocked: '#ef4444',   // 红色
};

// 缺口严重程度颜色
const GAP_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
};

export default function CoverageMiniMap({
  data,
  loading = false,
  error = null,
  onPoiClick,
  onSegmentClick,
  onGapClick,
  className,
  height = 400,
}: CoverageMiniMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 清理标记和弹窗
  const cleanupMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: data?.center ? [data.center.lng, data.center.lat] : [0, 0],
      zoom: data?.zoom || 2,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    // 捕获 Mapbox 内部错误（如瓦片请求被取消）
    map.current.on('error', (e) => {
      // 忽略 AbortError（瓦片请求被取消是正常行为）
      if (e.error?.message?.includes('aborted') || e.error?.name === 'AbortError') {
        return;
      }
      console.error('Mapbox error:', e.error);
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      cleanupMarkers();
      // 先停止地图渲染，然后再移除
      if (map.current) {
        map.current.stop();
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [MAPBOX_TOKEN]);

  // 更新地图数据
  useEffect(() => {
    if (!map.current || !mapLoaded || !data) return;

    cleanupMarkers();

    // 移动到数据区域
    if (data.bounds) {
      map.current.fitBounds(
        [
          [data.bounds.southwest.lng, data.bounds.southwest.lat],
          [data.bounds.northeast.lng, data.bounds.northeast.lat],
        ],
        { padding: 50, duration: 1000 }
      );
    } else if (data.center) {
      map.current.flyTo({
        center: [data.center.lng, data.center.lat],
        zoom: data.zoom || 6,
        duration: 1000,
      });
    }

    // 添加路段图层
    const segmentSourceId = 'segments-source';
    const segmentLayerId = 'segments-layer';

    // 移除旧图层和数据源
    if (map.current.getLayer(segmentLayerId)) {
      map.current.removeLayer(segmentLayerId);
    }
    if (map.current.getSource(segmentSourceId)) {
      map.current.removeSource(segmentSourceId);
    }

    // 添加路段
    if (data.segments && data.segments.length > 0) {
      const segmentFeatures = data.segments.map((segment) => {
        // 解码 polyline
        let coordinates: [number, number][] = [];
        if (segment.polyline) {
          try {
            const decoded = polyline.decode(segment.polyline);
            coordinates = decoded.map(([lat, lng]: number[]) => [lng, lat] as [number, number]);
          } catch (e) {
            console.warn('Failed to decode polyline:', e);
          }
        }

        // 如果没有 polyline，尝试从 POI 坐标创建直线
        if (coordinates.length === 0) {
          const fromPoi = data.pois.find(p => p.id === segment.fromPoiId);
          const toPoi = data.pois.find(p => p.id === segment.toPoiId);
          if (fromPoi && toPoi) {
            coordinates = [
              [fromPoi.coordinates.lng, fromPoi.coordinates.lat],
              [toPoi.coordinates.lng, toPoi.coordinates.lat],
            ];
          }
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: segment.id,
            status: segment.coverageStatus,
            color: SEGMENT_COLORS[segment.coverageStatus],
            dasharray: segment.coverageStatus === 'covered' ? [1] : [4, 2],
          },
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        };
      });

      map.current.addSource(segmentSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: segmentFeatures,
        },
      });

      // 为每个状态添加图层
      ['covered', 'warning', 'blocked'].forEach((status) => {
        const layerId = `${segmentLayerId}-${status}`;
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        
        map.current?.addLayer({
          id: layerId,
          type: 'line',
          source: segmentSourceId,
          filter: ['==', ['get', 'status'], status],
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': SEGMENT_COLORS[status as SegmentCoverageStatus],
            'line-width': 4,
            'line-dasharray': status === 'covered' ? [1, 0] : [4, 2],
            'line-opacity': 0.8,
          },
        });

        // 点击事件
        map.current?.on('click', layerId, (e) => {
          const feature = e.features?.[0];
          if (feature && feature.properties?.id) {
            const segment = data.segments.find(s => s.id === feature.properties?.id);
            if (segment) {
              onSegmentClick?.(segment);
            }
          }
        });

        map.current?.on('mouseenter', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current?.on('mouseleave', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });
      });
    }

    // 添加 POI 标记
    data.pois.forEach((poi, index) => {
      const el = document.createElement('div');
      el.className = 'coverage-marker';
      el.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: ${POI_COLORS[poi.coverageStatus]};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
      `;
      el.innerHTML = `${index + 1}`;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${poi.name}</div>
          <div style="font-size: 12px; color: #666;">
            Day ${poi.day} · ${t(`readiness.poiType.${poi.type}`, poi.type)}
          </div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 4px;">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: ${POI_COLORS[poi.coverageStatus]};
            "></span>
            <span style="font-size: 12px;">
              ${t(`readiness.coverageStatus.${poi.coverageStatus}`, poi.coverageStatus)}
            </span>
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">
            ${poi.evidenceCount} ${t('readiness.evidenceItems', 'evidence items')}
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([poi.coordinates.lng, poi.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => marker.togglePopup());
      el.addEventListener('mouseleave', () => marker.togglePopup());
      el.addEventListener('click', () => onPoiClick?.(poi));

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // 添加缺口标记
    data.gaps.forEach((gap) => {
      const el = document.createElement('div');
      el.className = 'gap-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="${GAP_COLORS[gap.severity]}">
          <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
        </svg>
      `;

      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: 600; color: ${GAP_COLORS[gap.severity]}; margin-bottom: 4px;">
            ${t('readiness.coverageGap', 'Coverage Gap')}
          </div>
          <div style="font-size: 12px;">${gap.message}</div>
          ${gap.missingEvidence && gap.missingEvidence.length > 0 ? `
            <div style="margin-top: 8px; font-size: 11px; color: #666;">
              ${t('readiness.missingEvidence', 'Missing')}: ${gap.missingEvidence.map(e => t(`readiness.evidenceType.${e}`, e)).join(', ')}
            </div>
          ` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([gap.coordinates.lng, gap.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => marker.togglePopup());
      el.addEventListener('mouseleave', () => marker.togglePopup());
      el.addEventListener('click', () => onGapClick?.(gap));

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });
  }, [data, mapLoaded, t, onPoiClick, onSegmentClick, onGapClick, cleanupMarkers]);

  // 没有 Token 的提示
  if (!MAPBOX_TOKEN) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-sm text-muted-foreground">
              {t('readiness.mapTokenMissing', 'Mapbox Access Token 未配置')}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('readiness.mapTokenHint', '请在 .env 文件中设置 VITE_MAPBOX_ACCESS_TOKEN')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 判断是否有有效数据
  const hasData = data && (data.pois?.length > 0 || data.segments?.length > 0);
  const showOverlay = loading || error || !hasData;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t('readiness.coverageMap', '覆盖地图')}
          </CardTitle>
          {data?.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {t('readiness.coverageRate', '覆盖率')}: {Math.round(data.summary.coverageRate * 100)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* 地图容器 */}
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="w-full"
            style={{ height }}
          />
          
          {/* 覆盖层：加载/错误/无数据状态 */}
          {showOverlay && (
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <div className="flex flex-col items-center gap-3 text-center px-4">
                {loading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('readiness.loadingMap', '加载地图数据...')}
                    </span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                    <div className="text-sm text-muted-foreground">{error}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('readiness.mapDataPending', '后端接口开发中，敬请期待')}
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {t('readiness.noMapData', '暂无地图数据')}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 图例 */}
        <div className="p-3 border-t bg-muted/30">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: POI_COLORS.covered }}
              />
              <span>{t('readiness.legend.covered', '已覆盖')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: POI_COLORS.partial }}
              />
              <span>{t('readiness.legend.partial', '部分覆盖')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: POI_COLORS.uncovered }}
              />
              <span>{t('readiness.legend.uncovered', '未覆盖')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="w-4 border-t-2 border-dashed"
                style={{ borderColor: SEGMENT_COLORS.warning }}
              />
              <span>{t('readiness.legend.warning', '有风险')}</span>
            </div>
          </div>
        </div>

        {/* 统计摘要 - 仅在有数据时显示 */}
        {data?.summary && (
          <div className="p-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">{t('readiness.coveredPois', '已覆盖 POI')}</div>
                <div className="font-medium">{data.summary.coveredPois}/{data.summary.totalPois}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-xs text-muted-foreground">{t('readiness.partialPois', '部分覆盖')}</div>
                <div className="font-medium">{data.summary.partialPois}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-xs text-muted-foreground">{t('readiness.uncoveredPois', '未覆盖')}</div>
                <div className="font-medium">{data.summary.uncoveredPois}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-xs text-muted-foreground">{t('readiness.totalGaps', '总缺口')}</div>
                <div className="font-medium">{data.summary.totalGaps}</div>
              </div>
            </div>
          </div>
        )}

        {/* 缺口列表 - 仅在有数据且有缺口时显示 */}
        {data?.gaps && data.gaps.length > 0 && (
          <div className="p-3 border-t space-y-2">
            <div className="text-sm font-medium">{t('readiness.gapsList', '覆盖缺口')}</div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {data.gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onGapClick?.(gap)}
                >
                  <AlertCircle 
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: GAP_COLORS[gap.severity] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">{gap.message}</div>
                    {gap.missingEvidence && gap.missingEvidence.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('readiness.missingEvidence', '缺少')}: {gap.missingEvidence.map(e => t(`readiness.evidenceType.${e}`, e)).join(', ')}
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: GAP_COLORS[gap.severity],
                      color: GAP_COLORS[gap.severity],
                    }}
                  >
                    {t(`readiness.severity.${gap.severity}`, gap.severity)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 全覆盖提示 - 仅在有数据且无缺口时显示 */}
        {data?.gaps && data.gaps.length === 0 && (
          <div className="p-4 border-t text-center">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('readiness.fullCoverage', '所有路段和 POI 都有证据覆盖')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
