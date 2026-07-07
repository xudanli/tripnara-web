import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  AlertCircle,
  Archive,
  CloudUpload,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Loader2,
  Trash2,
} from 'lucide-react';
import { tripFilesApi, TripFilesApiError } from '@/api/trip-detail-tab-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatTripFileBytes,
  formatTripFileStorageLabel,
  groupTripFilesByCategory,
  isTripFileOverviewDeletable,
  isTripFileOverviewDownloadable,
  isTripFileOverviewPending,
  isTripFileOverviewRecent,
  resolveTripFileDisplayName,
  tripFileOverviewStatusLabel,
  tripFileSourceLabel,
  tripFileStoragePercent,
} from '@/lib/trip-files.util';
import {
  partitionTripFileOverviewItems,
} from '@/lib/trip-detail-evidence-files.util';
import { TRIP_DETAIL_NAV, TRIP_DETAIL_TERMS } from '@/lib/trip-detail-terminology.util';
import { cn } from '@/lib/utils';
import { trackTripDetailEvidenceFilesLink } from '@/utils/trip-detail-analytics';
import type { TripFileCategory, TripFileOverviewItem, TripFileStatsResponse } from '@/types/trip-files';
import { toast } from 'sonner';
import { TripDetailSection, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

const sectionCompact = {
  className: 'shadow-none' as const,
  headerClassName: 'px-3 py-2',
  bodyClassName: 'p-3',
};

function CompactStatCard({
  label,
  value,
  icon,
  sub,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-bold leading-none text-foreground tabular-nums">{value}</p>
          {sub ? <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div> : null}
        </div>
        {icon ? <div className="shrink-0 text-muted-foreground">{icon}</div> : null}
      </div>
      {progress != null ? <Progress value={progress} className="mt-2 h-1" /> : null}
    </div>
  );
}

function FilesTabSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_280px]">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

const UPLOAD_CATEGORIES: Array<{ id: TripFileCategory; label: string }> = [
  { id: 'booking', label: '预订凭证' },
  { id: 'travel', label: '出行资料' },
  { id: 'insurance', label: '保险' },
  { id: 'receipts', label: '收据' },
  { id: 'visa', label: '签证' },
  { id: 'team', label: '团队共享' },
];

function statusBadgeClass(status: TripFileOverviewItem['status']): string {
  if (status === 'UPLOADED' || status === 'REFERENCE' || status === 'LINK') {
    return tripDetailUi.tagVerified;
  }
  if (status === 'PENDING') return tripDetailUi.tagConfirm;
  return tripDetailUi.tagReject;
}

interface TripDetailFilesTabProps {
  tripId: string;
  onOpenDecisionLog?: () => void;
  onOpenTimelineItem?: (itineraryItemId: string) => void;
}

export default function TripDetailFilesTab({
  tripId,
  onOpenDecisionLog,
  onOpenTimelineItem,
}: TripDetailFilesTabProps) {
  const [stats, setStats] = useState<TripFileStatsResponse | null>(null);
  const [items, setItems] = useState<TripFileOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<TripFileCategory>('booking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const overview = await tripFilesApi.loadTabData(tripId, { limit: 100 });
      setStats(overview.stats);
      setItems(overview.items ?? []);
    } catch (err) {
      const message = err instanceof TripFilesApiError ? err.message : '加载文件失败';
      toast.error(message);
      setStats(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grouped = useMemo(() => groupTripFilesByCategory(items), [items]);

  const recentFiles = useMemo(
    () =>
      [...items]
        .filter(isTripFileOverviewRecent)
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        )
        .slice(0, 8),
    [items],
  );

  const pendingItems = useMemo(() => items.filter(isTripFileOverviewPending), [items]);

  const { itineraryLinked, pending: partitionedPending } = useMemo(
    () => partitionTripFileOverviewItems(items),
    [items],
  );

  const filteredCategories = useMemo(() => {
    if (!stats?.categories?.length) return [];
    if (!activeCategory) return stats.categories;
    return stats.categories.filter((c) => c.id === activeCategory);
  }, [stats?.categories, activeCategory]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !tripId) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('单文件不能超过 20 MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);
    formData.append('title', file.name);

    try {
      setUploading(true);
      await tripFilesApi.upload(tripId, formData);
      toast.success('文件已上传');
      await loadData();
    } catch (err) {
      toast.error(err instanceof TripFilesApiError ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenItem = async (file: TripFileOverviewItem) => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (file.source !== 'trip_file' || file.status !== 'UPLOADED') {
      if (file.referenceText) {
        toast.info(file.referenceText);
      } else {
        toast.info('该资料暂不可下载');
      }
      return;
    }
    try {
      const res = await tripFilesApi.getDownloadUrl(tripId, file.id);
      window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof TripFilesApiError ? err.message : '下载失败');
    }
  };

  const handleDelete = async (file: TripFileOverviewItem) => {
    if (!isTripFileOverviewDeletable(file)) {
      toast.info('行程项资料请在对应日程中管理');
      return;
    }
    try {
      await tripFilesApi.delete(tripId, file.id);
      toast.success('已删除');
      await loadData();
    } catch (err) {
      toast.error(err instanceof TripFilesApiError ? err.message : '删除失败');
    }
  };

  if (loading && !stats) {
    return <FilesTabSkeleton />;
  }

  const storagePercent = stats
    ? tripFileStoragePercent(stats.storageUsedBytes, stats.storageQuotaBytes)
    : 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        <CompactStatCard
          label="全部文件"
          value={stats?.totalCount ?? 0}
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <CompactStatCard
          label="已上传"
          value={stats?.uploadedCount ?? 0}
          icon={<FileText className="h-4 w-4" />}
        />
        <CompactStatCard
          label="待补充"
          value={stats?.pendingCount ?? 0}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <CompactStatCard
          label="即将过期"
          value={stats?.expiringSoonCount ?? 0}
          icon={<Archive className="h-4 w-4" />}
        />
        <CompactStatCard
          label="空间使用"
          value={
            stats
              ? formatTripFileStorageLabel(stats.storageUsedBytes, stats.storageQuotaBytes)
              : '—'
          }
          icon={<HardDrive className="h-4 w-4" />}
          progress={storagePercent}
        />
      </div>

      {(onOpenDecisionLog || itineraryLinked.length > 0 || partitionedPending.length > 0) ? (
        <div className={cn(tripDetailUi.card, 'space-y-2 p-3 shadow-none')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">凭证与决策证据</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                用户上传、行程预订资料与决策历史引用的可执行凭证在此汇总。
              </p>
            </div>
            {onOpenDecisionLog ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2.5 text-[11px]"
                onClick={() => {
                  trackTripDetailEvidenceFilesLink({
                    tripId,
                    fromTab: 'files',
                    direction: 'to_decision_log',
                  });
                  onOpenDecisionLog();
                }}
              >
                查看{TRIP_DETAIL_NAV.decisionHistory}
              </Button>
            ) : null}
          </div>
          {partitionedPending.length > 0 ? (
            <p className="text-[11px] text-gate-confirm-foreground">
              {partitionedPending.length} 份{TRIP_DETAIL_TERMS.filePending.short} · 上传后可提升可执行把握度
            </p>
          ) : null}
        </div>
      ) : null}

      <TripDetailTwoColumn
        className="gap-3"
        mainClassName="space-y-2.5"
        sidebarClassName="space-y-2.5"
        main={
          <div className="space-y-2.5">
            {itineraryLinked.length > 0 ? (
              <TripDetailSection
                title="行程凭证（来自预订）"
                {...sectionCompact}
                action={
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {itineraryLinked.length} 项
                  </Badge>
                }
              >
                <ul className="space-y-1.5">
                  {itineraryLinked.slice(0, 8).map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {resolveTripFileDisplayName(file)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {tripFileSourceLabel(file.source)}
                          {file.itineraryItemTitle ? ` · ${file.itineraryItemTitle}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {file.itineraryItemId && onOpenTimelineItem ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              trackTripDetailEvidenceFilesLink({
                                tripId,
                                fromTab: 'files',
                                direction: 'to_timeline',
                                itineraryItemId: file.itineraryItemId ?? undefined,
                              });
                              onOpenTimelineItem(file.itineraryItemId!);
                            }}
                          >
                            行程项
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => void handleOpenItem(file)}
                        >
                          打开
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </TripDetailSection>
            ) : null}

            <TripDetailSection
              title="最近更新"
              {...sectionCompact}
              action={
                activeCategory ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setActiveCategory(null)}
                  >
                    显示全部分类
                  </Button>
                ) : null
              }
            >
              {recentFiles.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">暂无已上传文件</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {recentFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => void handleOpenItem(file)}
                      className={cn(
                        tripDetailUi.card,
                        'w-[148px] shrink-0 p-2.5 text-left shadow-none transition-colors hover:bg-muted/20',
                      )}
                    >
                      <FileText className={cn('mb-1.5 h-6 w-6', tripDetailUi.iconMuted)} />
                      <p className="truncate text-[11px] font-medium text-foreground">
                        {resolveTripFileDisplayName(file)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {file.fileSizeBytes ? formatTripFileBytes(file.fileSizeBytes) : tripFileSourceLabel(file.source)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {file.updatedAt
                          ? formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true, locale: zhCN })
                          : file.itineraryItemTitle ?? '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </TripDetailSection>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((cat) => {
                const catFiles = grouped.get(cat.id) ?? [];
                return (
                  <div key={cat.id} className={cn(tripDetailUi.card, 'flex flex-col p-3 shadow-none')}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <FolderOpen className={cn('h-3.5 w-3.5', tripDetailUi.iconMuted)} />
                      <h4 className="text-xs font-semibold text-foreground">{cat.title}</h4>
                      <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
                        {cat.count}
                      </Badge>
                    </div>
                    <p className="mb-2 line-clamp-2 text-[10px] text-muted-foreground">{cat.description}</p>
                    <ul className="flex-1 space-y-1">
                      {catFiles.slice(0, 3).map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-1.5 text-[11px] text-foreground"
                        >
                          <button
                            type="button"
                            className="truncate text-left hover:underline"
                            onClick={() => void handleOpenItem(f)}
                          >
                            {resolveTripFileDisplayName(f)}
                          </button>
                          <Badge variant="outline" className={cn('h-5 shrink-0 text-[10px]', statusBadgeClass(f.status))}>
                            {tripFileOverviewStatusLabel(f.status)}
                          </Badge>
                        </li>
                      ))}
                      {catFiles.length === 0 ? (
                        <li className="text-[10px] text-muted-foreground">暂无文件</li>
                      ) : null}
                    </ul>
                    <Button
                      variant="link"
                      className={cn(tripDetailUi.linkInline, 'mt-2 justify-start')}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      查看全部 {cat.count} 个文件 →
                    </Button>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                'rounded-xl border-2 border-dashed border-border bg-card p-4 text-center shadow-none',
                uploading && 'pointer-events-none opacity-70',
              )}
            >
              <CloudUpload className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="mb-2 text-xs text-muted-foreground">
                拖拽文件到此处，或{' '}
                <Button variant="link" className={tripDetailUi.linkInline} onClick={handleUploadClick}>
                  点击上传
                </Button>
              </p>
              <div className="mb-1.5 flex items-center justify-center gap-2">
                <span className="text-[10px] text-muted-foreground">上传到</span>
                <Select
                  value={uploadCategory}
                  onValueChange={(v) => setUploadCategory(v as TripFileCategory)}
                >
                  <SelectTrigger className="h-7 w-[128px] text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UPLOAD_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {uploading ? (
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  上传中…
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/70">
                  支持 PDF、JPG、PNG、DOCX、XLSX 等 · 单文件最大 20MB
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={(e) => void handleFileChange(e)}
              />
            </div>
          </div>
        }
        sidebar={
          <>
            <TripDetailSection title="文档提醒" {...sectionCompact}>
              <ul className="space-y-1.5 text-xs">
                <li className="flex justify-between">
                  <span>即将过期</span>
                  <Badge variant="outline" className={cn('h-5 text-[10px]', tripDetailUi.tagConfirm)}>
                    {stats?.expiringSoonCount ?? 0}
                  </Badge>
                </li>
                <li className="flex justify-between">
                  <span>待补充材料</span>
                  <Badge variant="outline" className={cn('h-5 text-[10px]', tripDetailUi.tagConfirm)}>
                    {stats?.pendingCount ?? 0}
                  </Badge>
                </li>
                <li className="flex justify-between">
                  <span>已齐全</span>
                  <Badge variant="outline" className={cn('h-5 text-[10px]', tripDetailUi.tagVerified)}>
                    {stats?.uploadedCount ?? 0}
                  </Badge>
                </li>
              </ul>
            </TripDetailSection>

            <TripDetailSection title="缺失材料" {...sectionCompact}>
              {pendingItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无待补充项</p>
              ) : (
                <ul className="space-y-1.5">
                  {pendingItems.slice(0, 8).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2 text-[11px] text-foreground">
                        {resolveTripFileDisplayName(item)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 shrink-0 px-2 text-[10px]"
                        onClick={() => {
                          setUploadCategory((item.category as TripFileCategory) || 'team');
                          handleUploadClick();
                        }}
                      >
                        上传
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TripDetailSection>

            {activeCategory ? (
              <TripDetailSection
                title={`${filteredCategories[0]?.title ?? '分类'} · 全部`}
                {...sectionCompact}
              >
                <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                  {(grouped.get(activeCategory) ?? []).map((file) => (
                    <li key={file.id} className="flex items-center gap-1.5 text-[11px]">
                      <span className="flex-1 truncate">{resolveTripFileDisplayName(file)}</span>
                      {isTripFileOverviewDownloadable(file) ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => void handleOpenItem(file)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isTripFileOverviewDeletable(file) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => void handleDelete(file)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <Badge variant="outline" className={cn('h-5 text-[10px]', statusBadgeClass(file.status))}>
                          {tripFileOverviewStatusLabel(file.status)}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </TripDetailSection>
            ) : null}
          </>
        }
      />
    </div>
  );
}
