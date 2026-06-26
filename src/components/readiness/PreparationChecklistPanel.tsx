/**
 * 统一的行前准备清单：系统评估 findings + 能力包同步项，单一入口避免混淆。
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from 'react-i18next';
import ChecklistSection from '@/components/readiness/ChecklistSection';
import type { ReadinessCheckResult } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import { readinessApi } from '@/api/readiness';
import { cn } from '@/lib/utils';

export type CapabilityPackChecklistItem = {
  id: string;
  ruleId: string;
  message: string;
  level: 'blocker' | 'must' | 'should' | 'optional';
  sourcePackType: string;
  checked: boolean;
  tasks?: string[];
};

type Level = CapabilityPackChecklistItem['level'];

const LEVEL_ORDER: Level[] = ['blocker', 'must', 'should', 'optional'];

const levelCardClass: Record<Level, string> = {
  blocker: 'bg-red-50 border-red-200',
  must: 'bg-orange-50 border-orange-200',
  should: 'bg-yellow-50 border-yellow-200',
  optional: 'bg-gray-50 border-gray-200',
};

interface PreparationChecklistPanelProps {
  tripId?: string;
  trip: TripDetail | null;
  readinessResult: ReadinessCheckResult | null;
  capabilityPackItems: CapabilityPackChecklistItem[];
  loadingCapabilityPack?: boolean;
  onReloadCapabilityPack?: () => void;
  onViewBlockerSolution?: (blockerId: string) => void;
  onReloadReadiness?: () => Promise<void>;
  onGoToCapabilityPacks?: () => void;
}

function CapabilityPackRows({
  items,
  tripId,
  onReload,
}: {
  items: CapabilityPackChecklistItem[];
  tripId?: string;
  onReload?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn('p-3 rounded-lg border text-sm', levelCardClass[item.level])}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={item.checked}
              disabled={!tripId}
              onCheckedChange={async (checked) => {
                if (!tripId) return;
                try {
                  await readinessApi.updateCapabilityPackChecklistItemStatus(
                    tripId,
                    item.id,
                    checked === true,
                  );
                  onReload?.();
                } catch (err) {
                  console.error('更新能力包清单项失败:', err);
                }
              }}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge variant="outline" className="text-[10px] bg-white/80">
                  {t(`dashboard.readiness.page.capabilityPackName.${item.sourcePackType}`, {
                    defaultValue: item.sourcePackType,
                  })}
                </Badge>
              </div>
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  item.checked && 'line-through text-muted-foreground',
                )}
              >
                {item.message}
              </p>
              {item.tasks && item.tasks.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {item.tasks.map((task, taskIndex) => (
                    <li key={taskIndex} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function groupCapabilityItemsByLevel(items: CapabilityPackChecklistItem[]) {
  const grouped: Record<Level, CapabilityPackChecklistItem[]> = {
    blocker: [],
    must: [],
    should: [],
    optional: [],
  };
  for (const item of items) {
    grouped[item.level]?.push(item);
  }
  return grouped;
}

function countFindingItems(result: ReadinessCheckResult | null): number {
  if (!result?.findings?.length) return 0;
  return result.findings.reduce((sum, f) => {
    return (
      sum +
      (f.blockers?.length || 0) +
      (f.must?.length || 0) +
      (f.should?.length || 0) +
      (f.optional?.length || 0)
    );
  }, 0);
}

export default function PreparationChecklistPanel({
  tripId,
  trip,
  readinessResult,
  capabilityPackItems,
  loadingCapabilityPack = false,
  onReloadCapabilityPack,
  onViewBlockerSolution,
  onReloadReadiness,
  onGoToCapabilityPacks,
}: PreparationChecklistPanelProps) {
  const { t } = useTranslation();
  const tripStartDate = trip?.startDate;
  const capByLevel = groupCapabilityItemsByLevel(capabilityPackItems);
  const findingCount = countFindingItems(readinessResult);
  const capCount = capabilityPackItems.length;
  const totalCount = findingCount + capCount;

  const hasFindings =
    readinessResult?.findings?.some(
      (f) =>
        (f.blockers?.length || 0) +
          (f.must?.length || 0) +
          (f.should?.length || 0) +
          (f.optional?.length || 0) >
        0,
    ) ?? false;

  if (loadingCapabilityPack && totalCount === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="w-5 h-5" />
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t('dashboard.readiness.page.unifiedChecklistTitle', {
              defaultValue: '行前准备清单',
            })}
          </CardTitle>
          <CardDescription>
            {t('dashboard.readiness.page.unifiedChecklistDescription', {
              defaultValue:
                '系统根据行程评估生成的待办；也可在「能力包」标签页将建议加入此清单。',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg bg-muted/30">
            <p>{t('dashboard.readiness.page.unifiedChecklistEmpty', { defaultValue: '暂无待办项' })}</p>
            {onGoToCapabilityPacks && (
              <button
                type="button"
                className="mt-2 text-primary text-xs hover:underline"
                onClick={onGoToCapabilityPacks}
              >
                {t('dashboard.readiness.page.goToCapabilityPacks', {
                  defaultValue: '前往能力包添加准备项 →',
                })}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {t('dashboard.readiness.page.unifiedChecklistTitle', {
                defaultValue: '行前准备清单',
              })}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('dashboard.readiness.page.unifiedChecklistDescription', {
                defaultValue:
                  '系统根据行程评估生成的待办；也可在「能力包」标签页将建议加入此清单。',
              })}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {t('dashboard.readiness.page.unifiedChecklistCount', {
              total: totalCount,
              defaultValue: `共 ${totalCount} 项`,
            })}
          </Badge>
        </div>
        {(findingCount > 0 || capCount > 0) && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {findingCount > 0 &&
              t('dashboard.readiness.page.checklistSourceSystem', {
                count: findingCount,
                defaultValue: `系统评估 ${findingCount} 项`,
              })}
            {findingCount > 0 && capCount > 0 && ' · '}
            {capCount > 0 &&
              t('dashboard.readiness.page.checklistSourceFromPacks', {
                count: capCount,
                defaultValue: `能力包 ${capCount} 项`,
              })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 系统评估 */}
        {hasFindings &&
          readinessResult?.findings?.map((finding, findingIndex) => {
            const allBlockers = finding.blockers || [];
            const allMust = finding.must || [];
            const allShould = finding.should || [];
            const allOptional = finding.optional || [];

            if (
              allBlockers.length +
                allMust.length +
                allShould.length +
                allOptional.length ===
              0
            ) {
              return null;
            }

            const findingTitle = finding.destinationId || finding.packId;

            return (
              <div key={findingIndex} className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('dashboard.readiness.page.checklistSystemSection', {
                    defaultValue: '系统评估',
                  })}
                  {findingTitle && findingTitle !== 'system' ? ` · ${findingTitle}` : ''}
                </h4>
                {allBlockers.length > 0 && (
                  <ChecklistSection
                    title={t('dashboard.readiness.page.blockers', { defaultValue: '阻塞项' })}
                    items={allBlockers}
                    level="blocker"
                    tripStartDate={tripStartDate}
                    trip={trip}
                    tripId={tripId}
                    onViewBlockerSolution={onViewBlockerSolution}
                  />
                )}
                {allMust.length > 0 && (
                  <ChecklistSection
                    title={t('dashboard.readiness.page.must', { defaultValue: '必做' })}
                    items={allMust}
                    level="must"
                    tripStartDate={tripStartDate}
                    trip={trip}
                    tripId={tripId}
                    onFindingUpdated={async () => {
                      await onReloadReadiness?.();
                    }}
                  />
                )}
                {allShould.length > 0 && (
                  <ChecklistSection
                    title={t('dashboard.readiness.page.should', { defaultValue: '建议' })}
                    items={allShould}
                    level="should"
                    tripStartDate={tripStartDate}
                    trip={trip}
                  />
                )}
                {allOptional.length > 0 && (
                  <ChecklistSection
                    title={t('dashboard.readiness.page.optional', { defaultValue: '可选' })}
                    items={allOptional}
                    level="optional"
                    tripStartDate={tripStartDate}
                    trip={trip}
                    tripId={tripId}
                    onFindingUpdated={async () => {
                      await onReloadReadiness?.();
                    }}
                  />
                )}
              </div>
            );
          })}

        {/* 能力包添加项（全局一次，按优先级） */}
        {capCount > 0 && (
          <div className="space-y-3 pt-1 border-t border-dashed">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t('dashboard.readiness.page.checklistFromCapabilityPacks', {
                count: capCount,
                defaultValue: `来自能力包（${capCount}）`,
              })}
            </h4>
            {LEVEL_ORDER.map((level) => {
              const items = capByLevel[level];
              if (items.length === 0) return null;
              const levelLabels: Record<Level, string> = {
                blocker: t('dashboard.readiness.page.blockers', { defaultValue: '阻塞项' }),
                must: t('dashboard.readiness.page.must', { defaultValue: '必做' }),
                should: t('dashboard.readiness.page.should', { defaultValue: '建议' }),
                optional: t('dashboard.readiness.page.optional', { defaultValue: '可选' }),
              };
              return (
                <div key={level} className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{levelLabels[level]}</p>
                  <CapabilityPackRows items={items} tripId={tripId} onReload={onReloadCapabilityPack} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
