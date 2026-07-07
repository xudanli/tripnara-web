import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  CoverageGap,
  CoverageMapPoi,
  CoverageMapSegment,
  EvidenceStatus,
  EvidenceType,
  PoiCoverageStatus,
} from '@/api/readiness';
import type { ItineraryItemDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

const COVERAGE_STATUS_LABELS: Record<PoiCoverageStatus, string> = {
  covered: '已覆盖',
  partial: '部分覆盖',
  uncovered: '未覆盖',
};

const COVERAGE_STATUS_CLASS: Record<PoiCoverageStatus, string> = {
  covered: 'bg-muted text-success border-border',
  partial: 'bg-muted text-warning border-border',
  uncovered: 'bg-muted text-error border-border',
};

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  opening_hours: '营业时间',
  weather: '天气',
  road_closure: '路况',
  booking_confirmation: '预订确认',
  permit: '许可/通行证',
  other: '其他',
};

const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  fetched: '已获取',
  missing: '缺失',
  fetching: '获取中',
  failed: '失败',
};

const EVIDENCE_STATUS_CLASS: Record<EvidenceStatus, string> = {
  fetched: 'bg-muted text-success border-border',
  missing: 'bg-muted text-warning border-border',
  fetching: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-muted text-error border-border',
};

const POI_TYPE_LABELS: Record<string, string> = {
  city: '城市',
  attraction: '景点',
  hotel: '住宿',
  restaurant: '餐饮',
  transport: '交通',
  other: '其他',
};

type InspectorSelection =
  | { kind: 'poi'; poi: CoverageMapPoi; item: ItineraryItemDetail | null }
  | { kind: 'segment'; segment: CoverageMapSegment }
  | { kind: 'gap'; gap: CoverageGap };

interface CoveragePoiInspectorProps {
  selection: InspectorSelection | null;
  onEditItem?: (item: ItineraryItemDetail) => void;
  onReplaceItem?: (item: ItineraryItemDetail) => void;
  onJumpToScheduleDay?: (dayIndex: number) => void;
  className?: string;
}

function formatItemTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'HH:mm');
  } catch {
    return iso;
  }
}

function formatItemDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

function formatEvidenceTime(value?: string): string | null {
  if (!value) return null;
  try {
    return format(new Date(value), 'MM-dd HH:mm');
  } catch {
    return value;
  }
}

function getPoiEvidenceDetails(poi: CoverageMapPoi): Array<{
  type: EvidenceType;
  status: EvidenceStatus;
  source?: string;
  lastUpdated?: string;
}> {
  const metadata = poi.metadata || {};
  return [
    {
      type: 'weather',
      status: poi.evidenceTypes.includes('weather') ? 'fetched' : poi.missingEvidence?.includes('weather') ? 'missing' : 'missing',
      source: metadata.weatherInfo?.source || metadata.weather?.source,
      lastUpdated: metadata.weatherFetchedAt || metadata.weatherInfo?.lastUpdated || metadata.weather?.lastUpdated,
    },
    {
      type: 'road_closure',
      status: poi.evidenceTypes.includes('road_closure') ? 'fetched' : poi.missingEvidence?.includes('road_closure') ? 'missing' : 'missing',
      source: metadata.roadStatus?.source || 'road.is',
      lastUpdated: metadata.roadStatusFetchedAt || metadata.roadStatus?.lastUpdated,
    },
    {
      type: 'opening_hours',
      status: poi.evidenceTypes.includes('opening_hours') ? 'fetched' : poi.missingEvidence?.includes('opening_hours') ? 'missing' : 'missing',
      source: metadata.openingHours_v1?.source || metadata.openingHoursSource,
      lastUpdated: metadata.openingHoursFetchedAt || metadata.openingHoursUpdatedAt || metadata.openingHours_v1?.updatedAt,
    },
  ].filter((row) => row.status === 'fetched' || poi.missingEvidence?.includes(row.type));
}

export default function CoveragePoiInspector({
  selection,
  onEditItem,
  onReplaceItem,
  onJumpToScheduleDay,
  className,
}: CoveragePoiInspectorProps) {
  if (!selection) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">点击地图上的 POI</p>
          <p className="text-xs mt-1">查看地点信息与证据覆盖，并可直接编辑行程项</p>
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'segment') {
    const { segment } = selection;
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">路段详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline">第 {segment.day} 天</Badge>
            <Badge variant="secondary">{segment.routeType}</Badge>
          </div>
          <p>
            距离 {(segment.distance / 1000).toFixed(1)} km · 约 {Math.round(segment.duration / 60)} 分钟
          </p>
          {segment.hazards.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">路段风险</p>
              {segment.hazards.map((hazard) => (
                <div
                  key={`${hazard.type}-${hazard.message}`}
                  className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-warning"
                >
                  {hazard.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">暂无额外风险标注</p>
          )}
          {segment.day > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onJumpToScheduleDay?.(segment.day - 1)}
            >
              在时间轴查看该天
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'gap') {
    const { gap } = selection;
    const evidenceStatuses = Array.isArray(gap.evidenceStatus) ? gap.evidenceStatus : [];
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            覆盖缺口
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{gap.message}</p>
          {gap.missingEvidence && gap.missingEvidence.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {gap.missingEvidence.map((evidence) => (
                <Badge key={evidence} variant="outline" className="text-xs">
                  缺 {EVIDENCE_LABELS[evidence] ?? evidence}
                </Badge>
              ))}
            </div>
          ) : null}
          {evidenceStatuses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">证据状态</p>
              <div className="space-y-1.5">
                {evidenceStatuses.map((entry) => (
                  <div
                    key={`${entry.type}-${entry.status}`}
                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <span>{EVIDENCE_LABELS[entry.type] ?? entry.type}</span>
                    <div className="flex items-center gap-1.5">
                      {entry.source ? <span className="text-muted-foreground">{entry.source}</span> : null}
                      {entry.lastUpdated ? (
                        <span className="text-muted-foreground">{formatEvidenceTime(entry.lastUpdated)}</span>
                      ) : null}
                      <Badge className={cn('border', EVIDENCE_STATUS_CLASS[entry.status])}>
                        {EVIDENCE_STATUS_LABELS[entry.status] ?? entry.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {gap.affectedDays?.[0] ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onJumpToScheduleDay?.(gap.affectedDays![0] - 1)}
            >
              在时间轴查看该天
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const { poi, item } = selection;
  const place = item?.Place;
  const placeName = place?.nameCN?.trim() || place?.nameEN?.trim() || poi.name;
  const poiEvidenceDetails = getPoiEvidenceDetails(poi);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{placeName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              第 {poi.day} 天 · {POI_TYPE_LABELS[poi.type] ?? poi.type}
            </p>
          </div>
          <Badge className={cn('shrink-0 border', COVERAGE_STATUS_CLASS[poi.coverageStatus])}>
            {COVERAGE_STATUS_LABELS[poi.coverageStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            证据 {poi.evidenceCount} 项
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            顺序 #{poi.order}
          </div>
        </div>

        {poi.evidenceTypes.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">已有证据</p>
            <div className="flex flex-wrap gap-1.5">
              {poi.evidenceTypes.map((evidence) => (
                <Badge key={evidence} variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {EVIDENCE_LABELS[evidence] ?? evidence}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {poi.missingEvidence && poi.missingEvidence.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">缺失证据</p>
            <div className="flex flex-wrap gap-1.5">
              {poi.missingEvidence.map((evidence) => (
                <Badge key={evidence} variant="outline" className="text-xs text-warning border-border">
                  {EVIDENCE_LABELS[evidence] ?? evidence}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {poiEvidenceDetails.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">证据来源</p>
            <div className="space-y-1.5">
              {poiEvidenceDetails.map((entry) => (
                <div
                  key={`${entry.type}-${entry.status}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                >
                  <span>{EVIDENCE_LABELS[entry.type] ?? entry.type}</span>
                  <div className="flex items-center gap-1.5">
                    {entry.source ? <span className="text-muted-foreground">{entry.source}</span> : null}
                    {entry.lastUpdated ? (
                      <span className="text-muted-foreground">{formatEvidenceTime(entry.lastUpdated)}</span>
                    ) : null}
                    <Badge className={cn('border', EVIDENCE_STATUS_CLASS[entry.status])}>
                      {EVIDENCE_STATUS_LABELS[entry.status] ?? entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {item ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">行程安排</p>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatItemDate(item.startTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {formatItemTime(item.startTime)} — {formatItemTime(item.endTime)}
              </span>
            </div>
            {place?.address ? (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{place.address}</span>
              </div>
            ) : null}
            {place?.rating != null ? (
              <p className="text-xs text-muted-foreground">评分 {place.rating}</p>
            ) : null}
            {item.note ? (
              <p className="text-xs text-muted-foreground border-t pt-2">备注：{item.note}</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground text-center">
            未匹配到对应行程项，可在时间轴手动核对
          </div>
        )}

        <div className="flex flex-col gap-2">
          {item && onEditItem ? (
            <Button type="button" size="sm" onClick={() => onEditItem(item)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              编辑行程项
            </Button>
          ) : null}
          {item && onReplaceItem ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onReplaceItem(item)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              替换地点
            </Button>
          ) : null}
          {place?.id ? (
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link to={`/dashboard/places/${place.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                查看地点详情
              </Link>
            </Button>
          ) : null}
          {poi.day > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onJumpToScheduleDay?.(poi.day - 1)}
            >
              在时间轴查看该天
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
