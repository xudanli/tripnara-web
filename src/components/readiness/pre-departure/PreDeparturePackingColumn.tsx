import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Pill,
  Shirt,
  Umbrella,
  Baby,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { readinessApi } from '@/api/readiness';
import {
  isPackingListZhLang,
  packingListCategoryLabelFromItem,
  type PackingListLang,
} from '@/lib/packing-list-display.util';
import {
  loadManualPackingItems,
  mergePackingListItems,
} from '@/lib/packing-list-manual-items';
import { cn } from '@/lib/utils';
import { PreDepartureColumnShell, PreDepartureColumnMetric } from './pre-departure-column-ui';
import { workbenchPreDepartureIconCell, workbenchSecondaryMetric } from '@/components/plan-studio/workbench/workbench-ui';

interface PackingListItemRow {
  id: string;
  category: string;
  checked: boolean;
  categoryZh?: string;
  category_zh?: string;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  clothing: Shirt,
  gear: Shirt,
  safety: Umbrella,
  electronics: Camera,
  medication: Pill,
  medicine: Pill,
  toiletries: Package,
  children: Baby,
  kids: Baby,
};

function iconForCategory(category: string): LucideIcon {
  const key = category.toLowerCase();
  for (const [pattern, Icon] of Object.entries(CATEGORY_ICON)) {
    if (key.includes(pattern)) return Icon;
  }
  return Package;
}

interface PreDeparturePackingColumnProps {
  tripId: string;
  refreshKey?: number;
  onViewAll?: () => void;
}

export default function PreDeparturePackingColumn({
  tripId,
  refreshKey = 0,
  onViewAll,
}: PreDeparturePackingColumnProps) {
  const { i18n } = useTranslation();
  const lang: PackingListLang = isPackingListZhLang(i18n.language) ? 'zh' : 'en';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PackingListItemRow[]>([]);

  const load = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      let serverItems: PackingListItemRow[] = [];
      try {
        const data = await readinessApi.getPackingList(tripId);
        serverItems = (data.items ?? []).map((item) => ({
          id: item.id,
          category: item.category,
          checked: item.checked,
          categoryZh: item.categoryZh,
          category_zh: item.category_zh,
        }));
      } catch {
        serverItems = [];
      }
      const merged = mergePackingListItems(
        serverItems,
        loadManualPackingItems(tripId),
      );
      setItems(
        merged.map((item) => ({
          id: item.id,
          category: item.category,
          checked: item.checked,
          categoryZh: 'categoryZh' in item ? item.categoryZh : undefined,
          category_zh: 'category_zh' in item ? item.category_zh : undefined,
        })),
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const { categories, totalProgress } = useMemo(() => {
    const map = new Map<
      string,
      { label: string; total: number; checked: number; icon: LucideIcon }
    >();

    for (const item of items) {
      const key = item.category || 'other';
      const existing = map.get(key);
      const label = packingListCategoryLabelFromItem(item, lang);
      if (existing) {
        existing.total += 1;
        if (item.checked) existing.checked += 1;
      } else {
        map.set(key, {
          label,
          total: 1,
          checked: item.checked ? 1 : 0,
          icon: iconForCategory(key),
        });
      }
    }

    const categories = [...map.values()]
      .map((entry) => ({
        ...entry,
        pct: entry.total > 0 ? Math.round((entry.checked / entry.total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);

    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const totalProgress = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { categories, totalProgress };
  }, [items, lang]);

  const headerExtra = (
    <PreDepartureColumnMetric label="总进度" value={`${totalProgress}%`} />
  );

  return (
    <PreDepartureColumnShell
      title="打包清单"
      headerExtra={headerExtra}
      footerLabel={items.length > 0 ? '查看完整打包清单' : undefined}
      onViewAll={items.length > 0 ? onViewAll : undefined}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </div>
      ) : categories.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          尚未生成打包清单
        </p>
      ) : (
        <ul className="space-y-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <li key={cat.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={workbenchPreDepartureIconCell}>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/85" />
                    </span>
                    <span className="truncate text-xs font-medium">{cat.label}</span>
                  </div>
                  <span className={cn(workbenchSecondaryMetric, 'shrink-0 text-[10px]')}>
                    {cat.checked}/{cat.total}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-9">
                  <Progress value={cat.pct} className="h-1.5 flex-1 [&>div]:bg-foreground/50" />
                  <span className={cn(workbenchSecondaryMetric, 'w-8 text-right text-[10px]')}>
                    {cat.pct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PreDepartureColumnShell>
  );
}
